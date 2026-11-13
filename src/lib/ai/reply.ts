import type { CloudApi } from "@/lib/whatsapp/cloud-api"
import type { Notifier } from "@/lib/push/notify"
import type { PendingReply } from "@/lib/whatsapp/ingest"
import { sendAndRecord } from "@/lib/whatsapp/outbound"
import { safeLog, type WaStore } from "@/lib/whatsapp/store"
import { runAgent } from "./agent"
import type { Notice } from "./tools"
import type { ChatModel } from "./model"
import type { ScheduleBooking } from "./seams"

export type ReplyDeps = {
  store: WaStore
  api: CloudApi
  // null until OPENAI_API_KEY and OPENAI_MODEL are set.
  model: ChatModel | null
  now: () => Date
  // null until VAPID is configured.
  notifier?: Notifier | null
  // Epoch ms by which all AI work in this request must be done. The webhook
  // sets it well under its maxDuration so a slow model ends in a logged error,
  // not a run the platform kills silently.
  deadline?: number
  // Test hook: a fixed id for this run's claim.
  runId?: string
  // Lets the assistant check availability and book, move or cancel its own
  // bookings (owner approved 2026-11-13). Null or missing: "not set up".
  booking?: ScheduleBooking | null
}

export type ReplyOutcome =
  | "sent"
  | "send_failed"
  | "skipped_human_mode"
  | "skipped_superseded"
  | "skipped_busy"
  | "skipped_not_configured"
  | "suppressed_after_takeover"
  | "no_reply"
  | "error"

const DEFAULT_RUN_MS = 45_000
// A claim older than this belongs to a run that was cut off.
const STALE_CLAIM_MS = 90_000
// Newer messages arriving mid-run restart the answer, at most this many times.
const MAX_RESTARTS = 2

// Answers one stored customer message with the AI, if the AI is allowed to.
// Runs after the webhook has returned 200. It never throws: every failure ends
// up in automation_events for a person to review.
//
// Only one run per conversation works at a time (a claim on wa_conversations).
// A run that cannot claim stops: the run holding the claim re-checks for newer
// messages before it sends and again after it releases the claim.
export async function answerInbound(pending: PendingReply, deps: ReplyDeps, depth = 0): Promise<ReplyOutcome> {
  const { store, api, model } = deps
  const deadline = deps.deadline ?? Date.now() + DEFAULT_RUN_MS
  const conversationId = pending.conversationId
  const notices: Notice[] = []
  const runId = deps.runId ?? crypto.randomUUID()
  let claimed = false
  let finished = false
  let answeredId: string | null = null

  const clearPending = () => store.updateConversation(conversationId, { ai_pending_since: null }).catch(() => undefined)

  try {
    const conversation = await store.getConversation(conversationId)
    if (!conversation) return "error"

    // A person has the conversation. The AI says nothing until it is handed back.
    if (conversation.mode === "human") {
      await clearPending()
      return "skipped_human_mode"
    }

    // The customer sent another message since; that one's run answers both.
    if ((await store.latestInboundMessageId(conversationId)) !== pending.messageId) return "skipped_superseded"

    if (!model) {
      if (!(await store.hasOpenEvent(conversationId, "ai_not_configured"))) {
        await safeLog(store, {
          type: "ai_not_configured",
          conversationId,
          leadId: conversation.lead_id,
          severity: "warning",
          needsReview: true,
          summary: "A customer wrote in, but the AI assistant is not configured, so nobody has replied.",
        })
      }
      await clearPending()
      return "skipped_not_configured"
    }

    claimed = await store.claimAiRun(conversationId, runId, new Date(Date.now() - STALE_CLAIM_MS).toISOString())
    if (!claimed) return "skipped_busy"

    for (let attempt = 0; ; attempt++) {
      answeredId = await store.latestInboundMessageId(conversationId)
      const current = await store.getConversation(conversationId)
      if (!current) return "error"
      if (current.mode === "human") {
        finished = true
        return "skipped_human_mode"
      }

      const { reply, handoffRequested, stopped } = await runAgent({
        store,
        model,
        conversation: current,
        now: deps.now(),
        notices,
        deadline,
        booking: deps.booking,
      })

      if (stopped) {
        finished = true
        await logSuppressed(store, conversationId, reply)
        return "suppressed_after_takeover"
      }

      // The customer wrote again while the model was working: answer with the
      // whole conversation instead of sending a reply to an old message.
      if (attempt < MAX_RESTARTS && (await store.latestInboundMessageId(conversationId)) !== answeredId) continue

      if (!reply) {
        finished = true
        return "no_reply"
      }

      // Claim the send: this run still holds the conversation, and nobody took
      // over (bot mode, or the AI's own handoff that nobody has picked up).
      if (!(await store.confirmAiSend(conversationId, runId, handoffRequested))) {
        finished = true
        await logSuppressed(store, conversationId, reply)
        return "suppressed_after_takeover"
      }

      const latest = (await store.getConversation(conversationId)) ?? current
      const { result } = await sendAndRecord({
        store,
        api,
        conversation: latest,
        content: { type: "text", body: reply },
        sender: { type: "bot" },
        now: deps.now(),
      })
      finished = true
      return result.ok ? "sent" : "send_failed"
    }
  } catch (error) {
    // Logged, so it is no longer silently waiting.
    finished = true
    await safeLog(store, {
      type: "ai_error",
      conversationId,
      severity: "error",
      needsReview: true,
      summary: `The assistant could not answer a customer message: ${error instanceof Error ? error.message : "unknown error"}`,
    })
    return "error"
  } finally {
    if (claimed) {
      const latestNow = await store.latestInboundMessageId(conversationId).catch(() => answeredId)
      const done = finished && latestNow === answeredId
      await store.releaseAiRun(conversationId, runId, done).catch(() => undefined)

      // A message that arrived after this run's last check found the claim
      // taken and stopped. Answer it now, while there is time left.
      if (finished && latestNow && latestNow !== answeredId && depth < 2 && deadline - Date.now() > 10_000) {
        await answerInbound({ conversationId, messageId: latestNow }, { ...deps, deadline, runId: undefined }, depth + 1)
      }
    }

    // Only now, with the customer's reply already sent (or the run over), do
    // staff phones get notified. The notifier never throws.
    const notifier = deps.notifier
    if (notifier && notices.length > 0) await Promise.allSettled(notices.map((notice) => notice(notifier)))
  }
}

async function logSuppressed(store: WaStore, conversationId: string, reply: string | null) {
  const conversation = await store.getConversation(conversationId).catch(() => null)
  await safeLog(store, {
    type: "reply_suppressed",
    conversationId,
    leadId: conversation?.lead_id ?? null,
    summary: "Staff took over while the assistant was working, so it stopped and sent nothing.",
    detail: { reply },
  })
}
