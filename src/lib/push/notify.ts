import { formatPhone } from "@/lib/phone"
import type { NewEvent } from "@/lib/whatsapp/types"
import type { PushPayload, PushSender, PushStore } from "./types"

// The slice of a conversation a notification needs.
export type NoticeConversation = {
  id: string
  wa_id: string
  profile_name: string | null
  lead_id: number | null
  assigned_sales_id: string | null
}

export type NotifyResult = { recipients: number; devices: number; delivered: number }

export interface Notifier {
  // The AI asked for a person: the assigned salesperson, or every Admin when nobody is assigned.
  handoff(conversation: NoticeConversation): Promise<NotifyResult>
  // A conversation was assigned or reassigned to someone. actorId is null for automatic rules.
  assigned(conversation: NoticeConversation, toSalesId: string, actorId: string | null): Promise<NotifyResult>
}

const GONE = new Set([404, 410])
function title(conversation: NoticeConversation) {
  return conversation.profile_name?.trim() || formatPhone(conversation.wa_id)
}

export function handoffRecipients(input: { assignedSalesId: string | null; adminIds: string[]; actorId: string | null }) {
  const ids = input.assignedSalesId ? [input.assignedSalesId] : input.adminIds
  return [...new Set(ids)].filter((id) => id !== input.actorId)
}

export function assignmentRecipients(input: { toSalesId: string; actorId: string | null }) {
  return input.toSalesId === input.actorId ? [] : [input.toSalesId]
}

// Sends a notification to each recipient's devices. Never throws: a failure is
// logged and the action that triggered it (handoff, assignment) is unaffected.
// Devices the push service reports as gone (404, 410) are removed.
export function createNotifier(deps: {
  store: PushStore
  sender: PushSender
  log: (event: NewEvent) => Promise<void>
  now: () => Date
}): Notifier {
  const { store, sender, log } = deps

  async function deliver(
    conversation: NoticeConversation,
    recipients: string[],
    payload: PushPayload,
    what: string,
  ): Promise<NotifyResult> {
    const result: NotifyResult = { recipients: recipients.length, devices: 0, delivered: 0 }
    if (recipients.length === 0) return result

    try {
      const targets = await store.subscriptionsFor(recipients)
      result.devices = targets.length
      const failures: string[] = []

      // All devices at once, so one slow push service delays nobody else.
      const outcomes = await Promise.all(
        targets.map((target) =>
          sender.send(target, payload).catch((error: unknown) => ({
            ok: false as const,
            statusCode: null,
            message: error instanceof Error ? error.message : "Unknown error",
          })),
        ),
      )

      // Bookkeeping errors do not change who was notified; they are logged once below.
      const bookkeeping: string[] = []
      const record = async (step: Promise<void>) => {
        try {
          await step
        } catch (error) {
          bookkeeping.push(error instanceof Error ? error.message : "unknown error")
        }
      }

      for (const [i, outcome] of outcomes.entries()) {
        const target = targets[i]
        if (outcome.ok) {
          result.delivered++
          await record(store.markSuccess(target.id, deps.now().toISOString()))
        } else if (outcome.statusCode !== null && GONE.has(outcome.statusCode)) {
          // Only a push service saying the device is gone removes it; timeouts and 5xx do not.
          await record(store.remove(target.id))
        } else {
          failures.push(`${outcome.statusCode ?? "no response"}: ${outcome.message}`)
          await record(store.recordFailure(target.id))
        }
      }

      if (bookkeeping.length > 0) {
        await log({
          type: "push_failed",
          conversationId: conversation.id,
          leadId: conversation.lead_id,
          severity: "warning",
          summary: `Notification records for ${what} could not be updated: ${bookkeeping[0]}`,
          detail: { errors: bookkeeping.slice(0, 5) },
        })
      }

      if (failures.length > 0) {
        await log({
          type: "push_failed",
          conversationId: conversation.id,
          leadId: conversation.lead_id,
          severity: "warning",
          needsReview: result.delivered === 0,
          summary: `${failures.length} of ${targets.length} phone notifications for ${what} could not be sent.`,
          detail: { failures: failures.slice(0, 5) },
        })
      }
    } catch (error) {
      await log({
        type: "push_failed",
        conversationId: conversation.id,
        leadId: conversation.lead_id,
        severity: "warning",
        needsReview: true,
        summary: `Phone notifications for ${what} could not be sent: ${error instanceof Error ? error.message : "unknown error"}`,
      })
    }

    return result
  }

  return {
    async handoff(conversation) {
      let adminIds: string[] = []
      // An Inactive assignee gets nothing, so the Admins hear about it instead.
      let assignee = conversation.assigned_sales_id
      try {
        if (assignee && !(await store.isActive(assignee))) assignee = null
      } catch {
        assignee = null
      }
      if (!assignee) {
        try {
          adminIds = await store.activeAdminIds()
        } catch (error) {
          await log({
            type: "push_failed",
            conversationId: conversation.id,
            leadId: conversation.lead_id,
            severity: "warning",
            needsReview: true,
            summary: `Phone notifications for a handoff could not be sent: ${error instanceof Error ? error.message : "unknown error"}`,
          })
          return { recipients: 0, devices: 0, delivered: 0 }
        }
      }
      const recipients = handoffRecipients({ assignedSalesId: assignee, adminIds, actorId: null })
      return deliver(
        conversation,
        recipients,
        {
          title: title(conversation),
          // Fixed text: the AI's reason can hold customer details, and a lock
          // screen is public. The reason is in the inbox.
          body: "Customer asked for a person",
          url: `/inbox/${conversation.id}`,
          tag: `conversation-${conversation.id}`,
        },
        "a handoff",
      )
    },

    async assigned(conversation, toSalesId, actorId) {
      return deliver(
        conversation,
        assignmentRecipients({ toSalesId, actorId }),
        {
          title: title(conversation),
          body: "Assigned to you",
          url: `/inbox/${conversation.id}`,
          tag: `conversation-${conversation.id}`,
        },
        "an assignment",
      )
    },
  }
}
