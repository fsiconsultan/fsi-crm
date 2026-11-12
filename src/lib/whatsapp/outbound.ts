import { FAILURE_TEXT, type CloudApi, type SendResult } from "./cloud-api"
import { safeLog, type WaStore } from "./store"
import type { Conversation, Message } from "./types"
import { isWindowOpen } from "./window"

export type OutboundContent =
  | { type: "text"; body: string }
  | { type: "template"; name: string; languageCode: string; body: string }

export type OutboundInput = {
  store: WaStore
  api: CloudApi
  conversation: Conversation
  content: OutboundContent
  sender: { type: "bot" } | { type: "human"; salesId: string }
  now: Date
}

export type OutboundResult = { result: SendResult; message: Message | null }

// Sends one message and records what really happened. A rejected send is stored
// as a failed message with Meta's reason and logged for review, so the thread
// never shows it as sent (contract 2.2, 2.7g).
export async function sendAndRecord(input: OutboundInput): Promise<OutboundResult> {
  const { store, api, conversation, content, sender, now } = input
  const salesId = sender.type === "human" ? sender.salesId : null

  let result: SendResult
  if (content.type === "text" && !isWindowOpen(conversation.last_inbound_at, now)) {
    // Meta would accept the call and fail it later; refuse up front instead.
    result = { ok: false, kind: "outside_window", code: "131047", message: FAILURE_TEXT.outside_window }
  } else if (content.type === "text") {
    result = await api.sendText(conversation.wa_id, content.body)
  } else {
    result = await api.sendTemplate(conversation.wa_id, content.name, content.languageCode)
  }

  const message = await store.insertMessage({
    conversationId: conversation.id,
    direction: "outbound",
    senderType: sender.type,
    senderSalesId: salesId,
    messageType: content.type,
    body: content.body,
    waMessageId: result.ok ? result.waMessageId : null,
    status: result.ok ? "sent" : "failed",
    errorCode: result.ok ? null : (result.code ?? result.kind),
    errorMessage: result.ok ? null : result.message,
  })

  if (result.ok) {
    await store.updateConversation(conversation.id, {
      last_message_at: now.toISOString(),
      last_message_preview: content.body.slice(0, 140),
    })
  } else {
    await safeLog(store, {
      type: "send_failed",
      conversationId: conversation.id,
      leadId: conversation.lead_id,
      severity: "error",
      needsReview: true,
      summary: `A ${sender.type === "bot" ? "bot" : "staff"} message was not sent: ${result.message}`,
      detail: { kind: result.kind, code: result.code, body: content.body },
      actorSalesId: salesId,
    })
  }

  return { result, message }
}
