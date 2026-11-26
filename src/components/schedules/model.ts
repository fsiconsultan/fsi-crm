import { addDays, formatDay, weekStart } from "@/lib/leads/dates"
import { nextDayStart, timeWithZone } from "@/lib/schedules/time"
import { SCHEDULE_KINDS, type ScheduleKind, type ScheduleStatus, type ScheduleView } from "@/lib/schedules/types"
import { OFFICE_TIME_ZONE } from "@/lib/schedules/zones"

// Pure models behind the schedule card and the calendar page: when a schedule
// counts as overdue, how the list is grouped, how a time is written, and the
// month grid. Lists and grids group by the office day in Bali
// (`ScheduleView.officeDay`); a time is written in the customer's own zone with
// its label, plus the Bali time when the zone is not WITA.

/** When a schedule is over: the end of its local day if all day, else its end (or start for a follow-up). */
export function endOf(item: Pick<ScheduleView, "allDay" | "day" | "timeZone" | "startsAt" | "endsAt">) {
  if (item.allDay) return nextDayStart(item.day, item.timeZone)
  return item.endsAt ?? item.startsAt
}

/** Still scheduled, but its time has passed: it needs "Mark done" or "Cancel". */
export function isOverdue(item: ScheduleView, now: string) {
  return item.status === "scheduled" && Date.parse(endOf(item)) <= Date.parse(now)
}

/** The status a person reads: "overdue" is a scheduled item whose time has passed. */
export type ItemState = ScheduleStatus | "overdue"

export function stateOf(item: ScheduleView, now: string): ItemState {
  return isOverdue(item, now) ? "overdue" : item.status
}

/** Booked by the WhatsApp assistant, and whether a person still has to confirm it with the customer. */
export function aiBooking(item: Pick<ScheduleView, "bookedBy" | "needsConfirmation">): "none" | "booked" | "toConfirm" {
  if (item.bookedBy !== "ai") return "none"
  return item.needsConfirmation ? "toConfirm" : "booked"
}

export type ScheduleGroups = {
  /** Scheduled and not over yet, soonest first. */
  upcoming: ScheduleView[]
  /** Scheduled but over, most recent first. */
  overdue: ScheduleView[]
  /** Done or cancelled, most recent first. */
  past: ScheduleView[]
}

const soonest = (a: ScheduleView, b: ScheduleView) => a.startsAt.localeCompare(b.startsAt)
const latest = (a: ScheduleView, b: ScheduleView) => b.startsAt.localeCompare(a.startsAt)

/** Groups one lead's schedules by what they need now. `now` is a UTC ISO timestamp. */
export function groupSchedules(items: ScheduleView[], now: string): ScheduleGroups {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()]
  const scheduled = unique.filter((item) => item.status === "scheduled")
  return {
    upcoming: scheduled.filter((item) => !isOverdue(item, now)).sort(soonest),
    overdue: scheduled.filter((item) => isOverdue(item, now)).sort(latest),
    past: unique.filter((item) => item.status !== "scheduled").sort(latest),
  }
}

/** Every schedule on one office (Bali) day, earliest first (all-day items lead). */
export function onDay<T extends ScheduleView>(items: T[], day: string): T[] {
  return items.filter((item) => item.officeDay === day).sort((a, b) => Number(b.allDay) - Number(a.allDay) || soonest(a, b))
}

/** Items grouped by office (Bali) day, days in order, earliest first within a day. */
export function byDay<T extends ScheduleView>(items: T[]): Array<{ day: string; items: T[] }> {
  const days = [...new Set(items.map((item) => item.officeDay))].sort()
  return days.map((day) => ({ day, items: onDay(items, day) }))
}

const weekdayShort = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" })
const weekdayLong = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" })
const dayMonthLong = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" })

const asDate = (day: string) => new Date(`${day}T00:00:00Z`)

/** "Tue, 18 Nov", with the year when it is not `today`'s year. */
export function dayLabel(day: string, today?: string) {
  const withYear = today !== undefined && day.slice(0, 4) !== today.slice(0, 4)
  return `${weekdayShort.format(asDate(day))}, ${formatDay(day, withYear)}`
}

/** "Today, Fri 13 Nov", "Tomorrow, Sat 14 Nov", else "Sun, 15 Nov". */
export function dayHeading(day: string, today: string) {
  const plain = `${weekdayShort.format(asDate(day))} ${formatDay(day, day.slice(0, 4) !== today.slice(0, 4))}`
  if (day === today) return `Today, ${plain}`
  if (day === addDays(today, 1)) return `Tomorrow, ${plain}`
  return dayLabel(day, today)
}

/** "Tuesday 18 November", for screen readers. */
export function dayLabelLong(day: string) {
  return `${weekdayLong.format(asDate(day))} ${dayMonthLong.format(asDate(day))}`
}

/** How every staff view writes a time (DESIGN.md "Schedules and calendar"). */
export const TIMES_NOTE = "Times show the customer's local time with its zone; Bali office time in grey."

type Timed = Pick<ScheduleView, "allDay" | "day" | "startTime" | "endTime" | "timeZone" | "officeDay" | "officeStartTime" | "officeEndTime">

/** The customer's local time with its zone: "10:00 to 11:00 WIB", "10:00 WITA" (follow-up), or "All day". */
export function timeLabel(item: Omit<Timed, "day" | "officeDay" | "officeStartTime" | "officeEndTime">) {
  if (item.allDay || !item.startTime) return "All day"
  return timeWithZone(item.startTime, item.endTime, item.timeZone)
}

/**
 * The same moment in Bali, for staff: "11:00 to 12:00 WITA", with the day in
 * front when the customer's day is another one ("Wed, 19 Nov, 00:30 WITA").
 * Null for WITA bookings and all-day items, which need no second time.
 */
export function officeTimeLabel(item: Timed, today?: string) {
  if (item.allDay || item.timeZone === OFFICE_TIME_ZONE || !item.officeStartTime) return null
  const time = timeWithZone(item.officeStartTime, item.officeEndTime, OFFICE_TIME_ZONE)
  return item.officeDay === item.day ? time : `${dayLabel(item.officeDay, today)}, ${time}`
}

/** "Tue, 18 Nov · 10:00 to 11:00 WIB": the customer's day and time. */
export function whenLabel(item: Omit<Timed, "officeDay" | "officeStartTime" | "officeEndTime">, today?: string) {
  return `${dayLabel(item.day, today)} · ${timeLabel(item)}`
}

/** `whenLabel` plus the Bali time in brackets when it differs, for sentences: "Tue, 18 Nov · 10:00 WIB (11:00 WITA in Bali)". */
export function whenText(item: Timed, today?: string) {
  const office = officeTimeLabel(item, today)
  return office ? `${whenLabel(item, today)} (${office} in Bali)` : whenLabel(item, today)
}

// ------------------------------------------------------------------ month grid

/** "YYYY-MM" */
export type Month = string

export function isMonth(value: unknown): value is Month {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function monthOf(day: string): Month {
  return day.slice(0, 7)
}

export function shiftMonth(month: Month, amount: number): Month {
  const [year, index] = month.split("-").map(Number)
  return new Date(Date.UTC(year, index - 1 + amount, 1)).toISOString().slice(0, 7)
}

const monthName = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })

/** "November 2026" */
export function monthLabel(month: Month) {
  return monthName.format(asDate(`${month}-01`))
}

export function lastDayOf(month: Month) {
  return addDays(`${shiftMonth(month, 1)}-01`, -1)
}

/** The first and last day of the whole weeks (Monday first) that hold the month. */
export function gridRange(month: Month) {
  const from = weekStart(`${month}-01`)
  const to = addDays(weekStart(lastDayOf(month)), 6)
  return { from, to }
}

/** A dot is a kind's color, or pink for an item that is overdue. */
export type Dot = ScheduleKind | "overdue"

export type DayCell = {
  day: string
  inMonth: boolean
  today: boolean
  /** Scheduled and done items that start on this day (cancelled ones are left out). */
  count: number
  /** One dot per kind on the day, in kind order; "overdue" first when anything is overdue. */
  dots: Dot[]
}

/** Whole weeks (Monday first) covering `month`, with each day's dots. */
export function monthGrid(month: Month, today: string, items: ScheduleView[], now: string): DayCell[][] {
  const shown = items.filter((item) => item.status !== "cancelled")
  const { from, to } = gridRange(month)
  const weeks: DayCell[][] = []
  for (let monday = from; monday <= to; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const day = addDays(monday, index)
        const onThisDay = shown.filter((item) => item.officeDay === day)
        const late = onThisDay.filter((item) => isOverdue(item, now))
        const kinds = SCHEDULE_KINDS.filter((kind) =>
          onThisDay.some((item) => item.kind === kind && !isOverdue(item, now)),
        )
        const dots: Dot[] = late.length > 0 ? ["overdue", ...kinds] : [...kinds]
        return { day, inMonth: monthOf(day) === month, today: day === today, count: onThisDay.length, dots }
      }),
    )
  }
  return weeks
}

/** The day an arrow key moves to from `day`. */
export function moveDay(day: string, key: string): string | null {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  if (key in steps) return addDays(day, steps[key])
  if (key === "Home") return weekStart(day)
  if (key === "End") return addDays(weekStart(day), 6)
  return null
}
