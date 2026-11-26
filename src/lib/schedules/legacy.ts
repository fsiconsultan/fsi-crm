import { localDay } from "./time"
import type { LegacyColumn } from "./types"
import { isTimeZone, OFFICE_TIME_ZONE } from "./zones"

// The old CRM shows one date per lead in leads.appointment, site_survey and
// follow_up_date. After every schedule change the matching column is set by
// this rule, for that one lead only:
//
// 1. A date the CRM did not write (no schedule of these kinds falls on it) that
//    is today or later is a manual date: it is never overwritten or cleared.
// 2. Otherwise the column becomes the soonest upcoming (today or later)
//    scheduled day of these kinds.
// 3. If nothing of these kinds is scheduled any more: a date the CRM wrote is
//    cleared when its schedule was cancelled, and kept when it was done (the
//    old CRM then still shows when it happened). An empty or past manual date
//    is left as it is.
//
// A schedule's day is its local day in its own zone (lead_schedules.time_zone):
// the date the customer was given. `today` is the office (WITA) day.

export type LegacySchedule = {
  status: string
  starts_at: string
  previous_starts_at: string | null
  /** Missing or null: WITA. */
  time_zone?: string | null
}

function dayOf(row: LegacySchedule, iso: string) {
  return localDay(iso, isTimeZone(row.time_zone) ? row.time_zone : OFFICE_TIME_ZONE)
}

export type LegacyDecision =
  | { action: "set"; value: string | null }
  | { action: "unchanged" }
  | { action: "kept_manual" }

export function decideLegacyDate(
  current: string | null,
  schedules: LegacySchedule[],
  today: string,
): LegacyDecision {
  const currentDay = current ? current.slice(0, 10) : null

  const ours = new Set<string>()
  for (const row of schedules) {
    ours.add(dayOf(row, row.starts_at))
    if (row.previous_starts_at) ours.add(dayOf(row, row.previous_starts_at))
  }

  if (currentDay && currentDay >= today && !ours.has(currentDay)) return { action: "kept_manual" }

  const upcoming = schedules
    .filter((row) => row.status === "scheduled")
    .map((row) => dayOf(row, row.starts_at))
    .filter((day) => day >= today)
    .sort()
  const next = upcoming[0] ?? null

  let value: string | null
  if (next) {
    value = next
  } else if (currentDay && ours.has(currentDay)) {
    const doneOnThatDay = schedules.some((row) => row.status === "done" && dayOf(row, row.starts_at) === currentDay)
    value = doneOnThatDay ? currentDay : null
  } else {
    value = currentDay
  }

  return value === currentDay ? { action: "unchanged" } : { action: "set", value }
}

export const LEGACY_LABEL: Record<LegacyColumn, string> = {
  appointment: "Appointment",
  site_survey: "Site survey",
  follow_up_date: "Follow-up",
}
