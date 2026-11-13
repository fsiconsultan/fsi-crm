import { safeLog, type WaStore } from "@/lib/whatsapp/store"
import type { LeadStatus } from "@/lib/leads/status"

// Automated status changes, one rule per defined event. A status is only ever
// changed through applyStatusEvent below.
//
// PROPOSED, awaiting FSI approval (see docs/whatsapp.md). `from` lists the
// statuses the rule may move a lead out of; any other current status is refused.
export const STATUS_RULES = {
  // The agent has collected every qualification answer.
  qualification_completed: { from: ["New"], to: "First Contact" },
} as const satisfies Record<string, { from: readonly LeadStatus[]; to: LeadStatus }>

// Status given to a lead the agent creates from a WhatsApp conversation.
export const STATUS_FOR_NEW_WHATSAPP_LEAD: LeadStatus = "New"

export type StatusEvent = keyof typeof STATUS_RULES

export function isStatusEvent(value: unknown): value is StatusEvent {
  return typeof value === "string" && value in STATUS_RULES
}

function sameInstant(a: string | null, b: string | null) {
  if (!a || !b) return false
  return new Date(a).getTime() === new Date(b).getTime()
}

// True when the lead's current status is the one the automation last wrote, at
// the exact time it wrote it. The guard below and the pipeline board's "AI" or
// "Person" marker both read it from here, so they cannot disagree.
export function automationWroteStatus(
  lastAutomated: { status: string; at: string | null } | null,
  lead: { status: string | null; status_started_at: string | null },
) {
  return (
    lastAutomated !== null &&
    lastAutomated.status === lead.status &&
    sameInstant(lastAutomated.at, lead.status_started_at)
  )
}

export type StatusOutcome =
  | { outcome: "changed"; from: string | null; to: string }
  | { outcome: "unchanged"; status: string }
  | { outcome: "refused"; reason: string }
  | { outcome: "failed"; reason: string }

type Input = {
  store: WaStore
  leadId: number
  event: string
  conversationId: string | null
  now: Date
}

// The single guarded path for automated status changes.
//
// It refuses to overwrite a status a person set. The automation records every
// status it writes in automation_events; if the lead's current status is not
// the one the automation last wrote, a person has changed it since (or set it
// in the first place), and the change is refused and logged for review.
export async function applyStatusEvent({ store, leadId, event, conversationId, now }: Input): Promise<StatusOutcome> {
  const refuse = async (type: "status_change_refused" | "status_change_failed", reason: string) => {
    await safeLog(store, {
      type,
      conversationId,
      leadId,
      severity: type === "status_change_failed" ? "error" : "warning",
      needsReview: true,
      summary: `Automated status change (${event}) on lead #${leadId} was not applied: ${reason}`,
      detail: { event },
    })
    return type === "status_change_failed"
      ? ({ outcome: "failed", reason } as const)
      : ({ outcome: "refused", reason } as const)
  }

  if (!isStatusEvent(event)) return refuse("status_change_failed", `"${event}" is not a defined event.`)
  const rule = STATUS_RULES[event]

  let lead
  try {
    lead = await store.getLead(leadId)
  } catch {
    return refuse("status_change_failed", "The lead could not be read.")
  }
  if (!lead) return refuse("status_change_failed", "The lead does not exist.")

  if (lead.status === rule.to) return { outcome: "unchanged", status: rule.to }

  // The automation records the status it wrote and the exact time it wrote it.
  // Both must still match: a person who moved the lead away and back to the
  // same status, or saved it in the legacy app (which writes status_started_at
  // as a date), changes the time.
  const lastAutomated = await store.lastAutomatedStatus(leadId)
  if (!automationWroteStatus(lastAutomated, lead)) {
    return refuse(
      "status_change_refused",
      `The current status (${lead.status ?? "none"}) was set by a person, so it was left as it is.`,
    )
  }

  if (!(rule.from as readonly string[]).includes(lead.status ?? "")) {
    return refuse(
      "status_change_refused",
      `The rule for ${event} only applies from ${rule.from.join(", ")}; the lead is at ${lead.status ?? "none"}.`,
    )
  }

  const at = now.toISOString()
  let written: boolean
  try {
    written = await store.updateLeadStatus(leadId, lead.status, rule.to, at)
  } catch {
    return refuse("status_change_failed", "The database rejected the update.")
  }
  if (!written) {
    return refuse("status_change_refused", "The status changed while the update was running, so it was left as it is.")
  }

  await safeLog(store, {
    type: "status_changed",
    conversationId,
    leadId,
    summary: `Lead #${leadId} moved from ${lead.status} to ${rule.to} (${event}).`,
    detail: { event, from: lead.status, to: rule.to, at },
  })
  return { outcome: "changed", from: lead.status, to: rule.to }
}
