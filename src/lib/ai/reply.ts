import type { CloudApi } from "@/lib/whatsapp/cloud-api"
import type { PendingReply } from "@/lib/whatsapp/ingest"
import { sendAndRecord } from "@/lib/whatsapp/outbound"
import { safeLog, type WaStore } from "@/lib/whatsapp/store"
import { runAgent } from "./agent"
import type { ChatModel } from "./model"

export type ReplyDeps = {
  store: WaStore
  api: CloudApi
  // null until OPENAI_API_KEY and OPENAI_MODEL are set.
  model: ChatModel | null
  now: () => Date
}

export type ReplyOutcome =
  | "sent"
  | "send_failed"
  | "skipped_human_mode"
  | "skipped_superseded"
  | "skipped_not_configured"
  | "suppressed_after_takeover"
  | "no_reply"
  | "error"

// Answers one stored customer message with the AI, if the AI is allowed to.
// Runs after the webhook has returned 200. It never throws: every failure ends
// up in automation_events for a person to review.
export async function answerInbound(pending: PendingReply, deps: ReplyDeps): Promise<ReplyOutcome> {
  const { store, api, model } = deps
  let conversationId: string | null = pending.conversationId

  try {
    const conversation = await store.getConversation(pending.conversationId)
    if (!conversation) return "error"
    conversationId = conversation.id

    // A person has the conversation. The AI says nothing until it is handed back.
    if (conversation.mode === "human") return "skipped_human_mode"

    // The customer sent another message since; that one's run answers both.
    if ((await store.latestInboundMessageId(conversation.id)) !== pending.messageId) return "skipped_superseded"

    if (!model) {
      if (!(await store.hasOpenEvent(conversation.id, "ai_not_configured"))) {
        await safeLog(store, {
          type: "ai_not_configured",
          conversationId: conversation.id,
          leadId: conversation.lead_id,
          severity: "warning",
          needsReview: true,
          summary: "A customer wrote in, but the AI assistant is not configured, so nobody has replied.",
        })
      }
      return "skipped_not_configured"
    }

    const { reply, handoffRequested } = await runAgent({ store, model, conversation, now: deps.now() })

    // Staff may have taken over while the model was thinking. Their takeover
    // wins: the AI reply is dropped. The one exception is the goodbye the AI
    // sends after asking for a handoff itself.
    const latest = await store.getConversation(conversation.id)
    if (!latest) return "error"
    if (latest.mode === "human" && !handoffRequested) {
      await safeLog(store, {
        type: "reply_suppressed",
        conversationId: latest.id,
        leadId: latest.lead_id,
        summary: "Staff took over while the assistant was writing, so its reply was not sent.",
        detail: { reply },
      })
      return "suppressed_after_takeover"
    }

    if (!reply) return "no_reply"

    const { result } = await sendAndRecord({
      store,
      api,
      conversation: latest,
      content: { type: "text", body: reply },
      sender: { type: "bot" },
      now: deps.now(),
    })
    return result.ok ? "sent" : "send_failed"
  } catch (error) {
    await safeLog(store, {
      type: "ai_error",
      conversationId,
      severity: "error",
      needsReview: true,
      summary: `The assistant could not answer a customer message: ${error instanceof Error ? error.message : "unknown error"}`,
    })
    return "error"
  }
}
