import { matchLeadByPhone } from "@/lib/phone"
import { decideAssignment } from "./assignment"
import { classifyMetaError, FAILURE_TEXT } from "./cloud-api"
import type { InboundMessage, StatusUpdate, WebhookEvent } from "./payload"
import { safeLog, type WaStore } from "./store"
import type { Conversation, MessageStatus } from "./types"

export type PendingReply = {
  conversationId: string
  messageId: string
  // Set when this message opened the conversation and a rule assigned it, so
  // the route can notify that salesperson after acknowledging Meta.
  assignedTo?: string | null
}

async function openConversation(
  store: WaStore,
  message: InboundMessage,
): Promise<{ conversation: Conversation; assignedTo: string | null }> {
  const existing = await store.getConversationByWaId(message.from)
  if (existing) return { conversation: existing, assignedTo: null }

  // First contact from this number: look for the lead it belongs to.
  const match = matchLeadByPhone(await store.findLeadsByPhoneWa(message.from), message.from)
  const lead = match.kind === "unique" ? match.lead : null
  const ownerActive = lead?.sales_id ? await store.isSalesUserActive(lead.sales_id) : false
  const assignment = decideAssignment(lead, ownerActive)

  const conversation = await store.createConversation({
    waId: message.from,
    profileName: message.profileName,
    phoneNumberId: message.phoneNumberId,
    leadId: lead?.id ?? null,
    assignedSalesId: assignment?.salesId ?? null,
  })

  if (lead) {
    await safeLog(store, {
      type: "lead_linked",
      conversationId: conversation.id,
      leadId: lead.id,
      summary: `WhatsApp number matched existing lead #${lead.id}.`,
      detail: { source: "whatsapp" },
    })
  }
  if (assignment) {
    await store.recordAssignment({
      conversationId: conversation.id,
      leadId: lead?.id ?? null,
      fromSalesId: null,
      toSalesId: assignment.salesId,
      rule: assignment.rule,
      assignedBy: null,
    })
  }
  if (match.kind === "ambiguous") {
    await safeLog(store, {
      type: "lead_match_ambiguous",
      conversationId: conversation.id,
      severity: "warning",
      needsReview: true,
      summary: `${match.leads.length} leads share this WhatsApp number. The conversation is not linked to any of them yet.`,
      detail: { lead_ids: match.leads.map((l) => l.id) },
    })
  }

  return { conversation, assignedTo: assignment?.salesId ?? null }
}

// Moves the conversation's "last message" fields forward only, so a late,
// older delivery cannot rewind the 24-hour window or the preview. Marks the
// conversation as waiting for the AI when the AI is answering.
async function touchConversation(store: WaStore, conversationId: string, message: InboundMessage, now: Date) {
  const fresh = await store.getConversation(conversationId)
  if (!fresh) return
  const at = message.timestamp ?? now.toISOString()
  const later = (value: string | null) => !value || new Date(at).getTime() >= new Date(value).getTime()

  await store.updateConversation(conversationId, {
    ...(later(fresh.last_inbound_at) ? { last_inbound_at: at } : {}),
    ...(later(fresh.last_message_at)
      ? { last_message_at: at, last_message_preview: (message.body ?? `[${message.messageType}]`).slice(0, 140) }
      : {}),
    ...(message.profileName ? { profile_name: message.profileName } : {}),
    ...(fresh.mode === "bot" && !fresh.ai_pending_since ? { ai_pending_since: now.toISOString() } : {}),
  })
}

async function storeInbound(store: WaStore, message: InboundMessage, now: Date): Promise<PendingReply | null> {
  // Meta retries a delivery until it gets a 200, so the same message can arrive
  // again. If an earlier attempt stored it and then failed, finish that work
  // here (the conversation update is idempotent) instead of dropping it.
  const existing = await store.getMessageByWaId(message.waMessageId)
  if (existing) {
    if (existing.direction !== "inbound") return null
    await touchConversation(store, existing.conversation_id, message, now)
    // Already answered (or a person replied): nothing more to queue.
    if (await store.hasOutboundAfter(existing.conversation_id, existing.created_at)) return null
    return { conversationId: existing.conversation_id, messageId: existing.id, assignedTo: null }
  }

  const { conversation, assignedTo } = await openConversation(store, message)

  const stored = await store.insertMessage({
    conversationId: conversation.id,
    direction: "inbound",
    senderType: "customer",
    messageType: message.messageType,
    body: message.body,
    waMessageId: message.waMessageId,
    status: "received",
    waTimestamp: message.timestamp,
  })
  // Another delivery stored it a moment ago; that one queues the reply.
  if (!stored) return null

  await touchConversation(store, conversation.id, message, now)

  if (message.messageType !== "text") {
    await safeLog(store, {
      type: "unsupported_message",
      conversationId: conversation.id,
      leadId: conversation.lead_id,
      summary: `The customer sent a message of type "${message.messageType}". Only text is read automatically.`,
      detail: { message_type: message.messageType },
    })
  }

  return { conversationId: conversation.id, messageId: stored.id, assignedTo }
}

const RANK: Record<MessageStatus, number> = { received: 0, pending: 0, sent: 1, delivered: 2, read: 3, failed: 1 }

// Applies a delivery update to an outbound message. When the message's Meta id
// is not stored yet (Meta can answer "failed" before the send is recorded), the
// update is held and applied by sendAndRecord once the id is written.
export async function applyStatus(store: WaStore, update: StatusUpdate) {
  const message = await store.getMessageByWaId(update.waMessageId)
  if (!message) {
    await store.holdStatus({
      waMessageId: update.waMessageId,
      status: update.status,
      errorCode: update.errorCode,
      errorMessage: update.errorMessage,
    })
    return
  }
  // A status for a customer message, or one already ahead of this update: nothing to do.
  if (message.direction !== "outbound") return
  const current = message.status as MessageStatus
  if (current === "failed" || current === update.status || RANK[update.status] < RANK[current]) return
  if (update.status === "failed" && (current === "delivered" || current === "read")) return

  if (update.status !== "failed") {
    await store.updateMessageStatus(update.waMessageId, { status: update.status })
    return
  }

  const kind = classifyMetaError(update.errorCode)
  const reason = update.errorMessage ? `${FAILURE_TEXT[kind]} (${update.errorMessage})` : FAILURE_TEXT[kind]
  await store.updateMessageStatus(update.waMessageId, {
    status: "failed",
    errorCode: update.errorCode ?? kind,
    errorMessage: reason,
  })
  await safeLog(store, {
    type: "send_failed",
    conversationId: message.conversation_id,
    severity: "error",
    needsReview: true,
    summary: `WhatsApp accepted a message and then failed to deliver it: ${reason}`,
    detail: { kind, code: update.errorCode, wa_message_id: update.waMessageId },
  })
}

// Stores everything in one webhook delivery. Runs before the 200 is returned,
// so if the database is down this throws, the route answers 500 and Meta
// retries. Returns the new customer messages that may need an AI reply.
export async function ingestEvents(store: WaStore, events: WebhookEvent[], now: Date): Promise<PendingReply[]> {
  const pending: PendingReply[] = []
  for (const event of events) {
    if (event.kind === "message") {
      const reply = await storeInbound(store, event, now)
      if (reply) pending.push(reply)
    } else {
      await applyStatus(store, event)
    }
  }
  return pending
}
