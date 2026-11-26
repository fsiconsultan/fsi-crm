import { automationWroteStatus } from "@/lib/ai/status-rules"
import type { Mover } from "./types"

/** The newest status the automation wrote on a lead (automation_events, actor_sales_id null). */
export type AutomatedStatus = { status: string; at: string | null }

/**
 * Who set a lead's current status, by the same rule the AI's status guard uses
 * (src/lib/ai/status-rules.ts): "ai" only when the automation's newest recorded
 * status change is the status the lead has now, written at the same instant.
 * Anything else was set by a person: the app's own status change writes no
 * automation event and a new status date.
 *
 * `lastAutomated` is undefined when the events could not be read for this lead;
 * then the answer is null and the card shows no marker.
 */
export function lastMover(
  lead: { status: string | null; status_started_at: string | null },
  lastAutomated: AutomatedStatus | null | undefined,
): Mover | null {
  if (!lead.status || lastAutomated === undefined) return null
  return automationWroteStatus(lastAutomated, lead) ? "ai" : "person"
}

type EventRow = { lead_id: number | null; detail: unknown }

function automatedStatus(detail: unknown): AutomatedStatus | null {
  if (typeof detail !== "object" || detail === null) return null
  const to = "to" in detail ? detail.to : null
  const at = "at" in detail ? detail.at : null
  if (typeof to !== "string") return null
  return { status: to, at: typeof at === "string" ? at : null }
}

/**
 * Newest automated status per lead, from event rows ordered newest first.
 * `complete` is false when the query hit its row limit: a lead with no row
 * might then have one that was cut off, so it is left out (unknown) instead of
 * being reported as never touched by the automation.
 */
export function latestAutomated(leadIds: number[], rows: EventRow[], complete: boolean) {
  const latest = new Map<number, AutomatedStatus | null>()
  for (const row of rows) {
    if (row.lead_id === null || latest.has(row.lead_id)) continue
    latest.set(row.lead_id, automatedStatus(row.detail))
  }
  if (complete) {
    for (const id of leadIds) if (!latest.has(id)) latest.set(id, null)
  }
  return latest
}
