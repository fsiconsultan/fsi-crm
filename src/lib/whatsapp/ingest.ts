import { matchLeadByPhone } from "@/lib/phone"
import { decideAssignment } from "./assignment"
import { classifyMetaError, FAILURE_TEXT } from "./cloud-api"
import type { InboundMessage, StatusUpdate, WebhookEvent } from "./payload"
import { safeLog, type WaStore } from "./store"
import type { Conversation, MessageStatus } from "./types"

export type PendingReply = { conversationId: string; messageId: string }

async function openConversation(store: WaStore, message: InboundMessage): Promise<Conversation> {
  const existing = await store.getConversationByWaId(message.from)
  if (existing) return existing

  // First contact from this number: look for the lead it belongs to.
  const match = matchLeadByPhone(await store.findLeadsByPhoneWa(message.from), message.from)
  const lead = match.kind === "unique" ? match.lead : null
  const assignment = decideAssignment(lead)

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

  return conversation
}

async function storeInbound(store: WaStore, message: InboundMessage, now: Date): Promise<PendingReply | null> {
  // Meta retries a delivery until it gets a 200, so the same message can arrive
  // more than once. Check first, and rely on the unique index for races.
  if (await store.getMessageByWaId(message.waMessageId)) return null

  const conversation = await openConversation(store, message)

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
  if (!stored) return null

  const at = message.timestamp ?? now.toISOString()
  await store.updateConversation(conversation.id, {
    last_inbound_at: at,
    last_message_at: at,
    last_message_preview: (message.body ?? `[${message.messageType}]`).slice(0, 140),
    ...(message.profileName ? { profile_name: message.profileName } : {}),
  })

  if (message.messageType !== "text") {
    await safeLog(store, {
      type: "unsupported_message",
      conversationId: conversation.id,
      leadId: conversation.lead_id,
      summary: `The customer sent a ${message.messageType} message. Only text is read automatically.`,
      detail: { message_type: message.messageType },
    })
  }

  return { conversationId: conversation.id, messageId: stored.id }
}

const RANK: Record<MessageStatus, number> = { received: 0, sent: 1, delivered: 2, read: 3, failed: 1 }

async function applyStatus(store: WaStore, update: StatusUpdate) {
  const message = await store.getMessageByWaId(update.waMessageId)
  // A status for a message we did not send from this app (or already ahead of it): nothing to do.
  if (!message || message.direction !== "outbound") return
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
