import type { SlotProblem } from "@/lib/ai/seams"
import { addDays } from "@/lib/leads/dates"
import { isTime, localDay, toUtc } from "./time"
import type { ScheduleRow } from "./view"
import type { TimeZoneId } from "./zones"

// When the WhatsApp assistant may offer and book times. Every number FSI has
// to approve is in this block; nothing else in the code hard-codes them.
// Days and hours are the CUSTOMER's local time (their zone, zones.ts): a
// customer in Jakarta gets 09:00 to 17:00 WIB, which is 10:00 to 18:00 in
// Bali. Busy times and overlaps are compared in UTC, so bookings in different
// zones for the same salesperson can never double up.
export const AI_SCHEDULING = {
  /** Working days, as JavaScript weekday numbers (0 Sunday ... 6 Saturday): Monday to Saturday. */
  workingDays: [1, 2, 3, 4, 5, 6] as readonly number[],
  /** First possible start and latest possible end of a booking, HH:MM in the customer's zone. */
  dayStart: "09:00",
  dayEnd: "17:00",
  /** Never offer or book anything starting sooner than this from now. */
  minNoticeHours: 4,
  /** Never offer or book further ahead than this many days. */
  maxDaysAhead: 60,
  /** Offered start times are on this grid from dayStart (a customer may still book e.g. 10:15 if it is free). */
  slotStepMinutes: 60,
  /** How many calendar days from the asked date the search looks for free slots. */
  searchDays: 7,
  /** At most this many slots per answer. */
  maxSlots: 3,
  /** Length of each kind the assistant books, in minutes. */
  minutes: { site_survey: 120, appointment: 60, call: 30 } as Record<AiBookableKind, number>,
} as const

/** The kinds the assistant may book. Follow-ups are internal reminders, never booked by the assistant. */
export const AI_BOOKABLE_KINDS = ["site_survey", "appointment", "call"] as const
export type AiBookableKind = (typeof AI_BOOKABLE_KINDS)[number]

export function isAiBookableKind(value: unknown): value is AiBookableKind {
  return typeof value === "string" && (AI_BOOKABLE_KINDS as readonly string[]).includes(value)
}

export type Interval = { start: number; end: number }

export type Slot = {
  /** Local day in `timeZone`, YYYY-MM-DD. */
  date: string
  /** HH:MM in `timeZone`. */
  startTime: string
  endTime: string
  startsAt: string
  endsAt: string
  timeZone: TimeZoneId
}

const MINUTE = 60_000

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function timeOf(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function weekday(day: string) {
  return new Date(`${day}T00:00:00Z`).getUTCDay()
}

export function isWorkingDay(day: string) {
  return AI_SCHEDULING.workingDays.includes(weekday(day))
}

export function slotAt(kind: AiBookableKind, date: string, startTime: string, zone: TimeZoneId): Slot {
  const endTime = timeOf(minutesOf(startTime) + AI_SCHEDULING.minutes[kind])
  return { date, startTime, endTime, startsAt: toUtc(date, startTime, zone), endsAt: toUtc(date, endTime, zone), timeZone: zone }
}

/** The earliest moment a booking may start. */
export function earliestStart(now: Date) {
  return now.getTime() + AI_SCHEDULING.minNoticeHours * 60 * MINUTE
}

/** Whether a start time (local day and HH:MM in `zone`) is allowed at all, before looking at anyone's calendar. */
export function checkSlotRules(kind: AiBookableKind, date: string, startTime: string, now: Date, zone: TimeZoneId): SlotProblem | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || !isTime(startTime)) {
    return "bad_input"
  }
  if (!isWorkingDay(date)) return "not_working_day"
  const start = minutesOf(startTime)
  if (start < minutesOf(AI_SCHEDULING.dayStart) || start + AI_SCHEDULING.minutes[kind] > minutesOf(AI_SCHEDULING.dayEnd)) {
    return "outside_hours"
  }
  if (Date.parse(toUtc(date, startTime, zone)) < earliestStart(now)) return "too_soon"
  if (date > addDays(localDay(now, zone), AI_SCHEDULING.maxDaysAhead)) return "too_far"
  return null
}

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end
}

/**
 * The salesperson's busy times from CRM items: their scheduled appointments,
 * site surveys and calls. Follow-ups are reminders and block nothing; an
 * all-day item blocks its whole day.
 */
export function busyFromRows(rows: ScheduleRow[], salesId: string, excludeId?: string): Interval[] {
  return rows
    .filter((row) => row.status === "scheduled" && row.sales_id === salesId && row.kind !== "follow_up" && row.id !== excludeId)
    .map((row) => {
      const start = Date.parse(row.starts_at)
      const end = row.ends_at ? Date.parse(row.ends_at) : start + (row.all_day ? 24 * 60 : 60) * MINUTE
      return { start, end }
    })
}

/**
 * Google busy blocks that are not the CRM's own events. Every CRM item is
 * already counted per salesperson from lead_schedules; dropping a block that
 * matches a CRM item exactly keeps one salesperson's booking from blocking
 * everyone on the shared calendar. A block Google merged with anything else is
 * kept (busy), so the check only ever errs towards "not free".
 */
export function foreignGoogleBusy(google: Interval[], crmRows: ScheduleRow[]): Interval[] {
  const crm = new Set(
    crmRows
      .filter((row) => row.google_event_id && !row.all_day)
      .map((row) => {
        const start = Date.parse(row.starts_at)
        const end = row.ends_at ? Date.parse(row.ends_at) : start + 30 * MINUTE
        return `${start}-${end}`
      }),
  )
  return google.filter((block) => !crm.has(`${block.start}-${block.end}`))
}

/** The calendar window findSlots looks at (UTC): from the start of `fromDay` to the end of the last searched day, in `zone`. */
export function searchWindow(fromDay: string, zone: TimeZoneId) {
  return {
    fromIso: toUtc(fromDay, AI_SCHEDULING.dayStart, zone),
    toIso: toUtc(addDays(fromDay, AI_SCHEDULING.searchDays - 1), AI_SCHEDULING.dayEnd, zone),
  }
}

/**
 * Up to `maxSlots` free start times from `fromDay` onwards, in working hours,
 * not sooner than the minimum notice, clear of every busy interval. With a
 * preferred time, each day's slots closest to it come first.
 */
export function findSlots(input: {
  kind: AiBookableKind
  /** Local day in `zone`. */
  fromDay: string
  preferredTime?: string | null
  now: Date
  busy: Interval[]
  zone: TimeZoneId
}): Slot[] {
  const { kind, now, busy, zone } = input
  const length = AI_SCHEDULING.minutes[kind]
  const first = minutesOf(AI_SCHEDULING.dayStart)
  const last = minutesOf(AI_SCHEDULING.dayEnd) - length
  const preferred = input.preferredTime && isTime(input.preferredTime) ? minutesOf(input.preferredTime) : null
  const out: Slot[] = []

  for (let i = 0; i < AI_SCHEDULING.searchDays && out.length < AI_SCHEDULING.maxSlots; i++) {
    const day = addDays(input.fromDay, i)
    if (!isWorkingDay(day)) continue
    const starts: number[] = []
    for (let m = first; m <= last; m += AI_SCHEDULING.slotStepMinutes) starts.push(m)
    if (preferred !== null) starts.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b)

    for (const start of starts) {
      if (out.length >= AI_SCHEDULING.maxSlots) break
      const startTime = timeOf(start)
      if (checkSlotRules(kind, day, startTime, now, zone)) continue
      const slot = slotAt(kind, day, startTime, zone)
      const span = { start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) }
      if (busy.some((b) => overlaps(span, b))) continue
      out.push(slot)
    }
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}
