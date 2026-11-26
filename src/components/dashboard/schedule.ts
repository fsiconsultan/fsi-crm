import { addDays, weekStart } from "@/lib/leads/dates"
import type { TimeZoneId, ZoneLabel } from "@/lib/schedules/zones"

/** Today plus this many days ahead. */
export const SCHEDULE_DAYS = 14

export type ScheduleType = "appointment" | "site_survey" | "follow_up"

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  appointment: "Appointment",
  site_survey: "Site survey",
  follow_up: "Follow-up",
}

const TYPE_ORDER: Record<ScheduleType, number> = { appointment: 0, site_survey: 1, follow_up: 2 }

/** The slice of a lead the schedule reads. The three dates are `date` columns (Bali days). */
export type ScheduleRow = {
  id: number
  customer_name: string | null
  sales_id: string | null
  status: string | null
  appointment: string | null
  site_survey: string | null
  follow_up_date: string | null
}

export type ScheduleItem = {
  type: ScheduleType
  leadId: number
  name: string | null
  salesId: string | null
  /** Bali (WITA) office day the item is grouped under. */
  day: string
  /** Set when the item comes from lead_schedules rather than a date column on the lead. */
  scheduleId?: string
  /** HH:MM WITA (office time); null when all day. Only on lead_schedules items. */
  startTime?: string | null
  title?: string
  /** The schedule's own kind ("call" shows under the appointment type). */
  kind?: "appointment" | "site_survey" | "call" | "follow_up"
  /** The booking's own zone and label. Only on lead_schedules items. */
  timeZone?: TimeZoneId
  zoneLabel?: ZoneLabel
  /** Day and HH:MM in the booking's zone (what the customer was told); null time when all day. */
  localDay?: string
  localStartTime?: string | null
}

export type ScheduleDay = { day: string; items: ScheduleItem[] }

/**
 * A booked item's time for the row: the customer's start with its zone, and
 * the Bali time in brackets when the zone is not WITA ("10:00 WIB (11:00
 * WITA)"). "All day" without a time; null for dates typed on the lead.
 */
export function itemTime(item: Pick<ScheduleItem, "scheduleId" | "startTime" | "zoneLabel" | "localStartTime">) {
  if (!item.scheduleId) return null
  if (!item.startTime) return "All day"
  const label = item.zoneLabel ?? "WITA"
  const local = item.localStartTime ?? item.startTime
  return label === "WITA" ? `${local} WITA` : `${local} ${label} (${item.startTime} WITA)`
}

export function isClosed(status: string | null) {
  return status === "Deal" || status === "No Deal"
}

/** `today` is a Bali day (dates.ts `today()`), so the window follows Bali's calendar, not the server's. */
export function scheduleWindow(today: string) {
  return { from: today, to: addDays(today, SCHEDULE_DAYS) }
}

/**
 * The dated things on these leads that fall inside the window, grouped by day,
 * soonest first. A lead can appear more than once (an appointment and a
 * follow-up are two items). A follow-up on a lead already at Deal or No deal is
 * left out, the same way the "follow-ups due" count leaves it out.
 */
export function groupByDay(rows: ScheduleRow[], window: { from: string; to: string }): ScheduleDay[] {
  const byDay = new Map<string, ScheduleItem[]>()

  const add = (row: ScheduleRow, type: ScheduleType, value: string | null) => {
    const day = value?.slice(0, 10)
    if (!day || day < window.from || day > window.to) return
    const items = byDay.get(day) ?? []
    items.push({ type, leadId: row.id, name: row.customer_name, salesId: row.sales_id, day })
    byDay.set(day, items)
  }

  for (const row of rows) {
    add(row, "appointment", row.appointment)
    add(row, "site_survey", row.site_survey)
    if (!isClosed(row.status)) add(row, "follow_up", row.follow_up_date)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({ day, items: items.sort(byTypeTimeName) }))
}

function byTypeTimeName(a: ScheduleItem, b: ScheduleItem) {
  return (
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
    (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") ||
    (a.name ?? "").localeCompare(b.name ?? "") ||
    a.leadId - b.leadId
  )
}

/** The slice of a lead_schedules row the card reads (a ScheduleView fits). */
export type ScheduledEntry = {
  id: string
  leadId: number | null
  salesId: string | null
  kind: "appointment" | "site_survey" | "call" | "follow_up"
  title: string
  timeZone: TimeZoneId
  zoneLabel: ZoneLabel
  /** Day and HH:MM in the booking's zone. */
  day: string
  startTime: string | null
  /** Bali (WITA) day and HH:MM: the card groups and sorts by these. */
  officeDay: string
  officeStartTime: string | null
}

/**
 * Adds lead_schedules items to the days built from the leads' date columns.
 * Items are grouped by their Bali (WITA) office day and carry their own zone
 * and local time for display. The server actions mirror a schedule's local day
 * into the matching column, so the same plan would show twice: a column item
 * is dropped when a schedule of the same type (a call counts as an
 * appointment) is on the same lead and local day.
 * Only the column items that duplicate a schedule are dropped; a different
 * date typed by hand in the old CRM still shows.
 */
export function mergeScheduled(
  days: ScheduleDay[],
  entries: ScheduledEntry[],
  names: ReadonlyMap<number, string | null>,
  window: { from: string; to: string },
): ScheduleDay[] {
  const scheduled: ScheduleItem[] = entries.flatMap((entry) =>
    entry.leadId !== null && entry.officeDay >= window.from && entry.officeDay <= window.to
      ? [
          {
            type: entry.kind === "call" ? ("appointment" as const) : entry.kind,
            leadId: entry.leadId,
            name: names.get(entry.leadId) ?? null,
            salesId: entry.salesId,
            day: entry.officeDay,
            scheduleId: entry.id,
            startTime: entry.officeStartTime,
            title: entry.title,
            kind: entry.kind,
            timeZone: entry.timeZone,
            zoneLabel: entry.zoneLabel,
            localDay: entry.day,
            localStartTime: entry.startTime,
          },
        ]
      : [],
  )
  const covered = new Set(scheduled.map((item) => `${item.leadId}|${item.type}|${item.localDay}`))

  const byDay = new Map<string, ScheduleItem[]>()
  for (const day of days) {
    byDay.set(
      day.day,
      day.items.filter((item) => item.scheduleId || !covered.has(`${item.leadId}|${item.type}|${item.day}`)),
    )
  }
  for (const item of scheduled) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item])

  return [...byDay.entries()]
    .filter(([, items]) => items.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({ day, items: items.sort(byTypeTimeName) }))
}

export type CalendarCell = { day: string; inWindow: boolean; today: boolean; count: number }

/** Whole weeks (Monday first) covering the window, for the mini calendar. */
export function calendarWeeks(window: { from: string; to: string }, days: ScheduleDay[]): CalendarCell[][] {
  const counts = new Map(days.map((entry) => [entry.day, entry.items.length]))
  const weeks: CalendarCell[][] = []
  for (let monday = weekStart(window.from); monday <= window.to; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const day = addDays(monday, index)
        return {
          day,
          inWindow: day >= window.from && day <= window.to,
          today: day === window.from,
          count: counts.get(day) ?? 0,
        }
      }),
    )
  }
  return weeks
}
