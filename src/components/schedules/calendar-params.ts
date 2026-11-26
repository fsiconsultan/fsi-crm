import { isDay } from "@/lib/leads/dates"
import { isScheduleKind, type ScheduleKind } from "@/lib/schedules/types"
import { gridRange, isMonth, monthOf, type Month } from "./model"

// The calendar page's URL: month, view, salesperson (Admin) and kind, plus the
// day the agenda opens on. Anything unreadable falls back to the default.

export type CalendarView = "month" | "agenda"

export type CalendarParams = {
  month: Month
  view: CalendarView
  /** sales_users.id or "" for everyone RLS allows. */
  sales: string
  kind: ScheduleKind | ""
  /** A day inside the month's grid, or "". */
  day: string
}

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "")

export function parseCalendarParams(raw: Record<string, string | string[] | undefined>, today: string): CalendarParams {
  const month = isMonth(one(raw.month)) ? one(raw.month) : monthOf(today)
  const kind = one(raw.kind)
  const day = one(raw.day)
  const { from, to } = gridRange(month)
  return {
    month,
    view: one(raw.view) === "agenda" ? "agenda" : "month",
    sales: one(raw.sales),
    kind: isScheduleKind(kind) ? kind : "",
    day: isDay(day) && day >= from && day <= to ? day : "",
  }
}

export function calendarHref(params: Partial<CalendarParams> & { month: Month }) {
  const query = new URLSearchParams()
  query.set("month", params.month)
  if (params.view === "agenda") query.set("view", "agenda")
  if (params.sales) query.set("sales", params.sales)
  if (params.kind) query.set("kind", params.kind)
  if (params.day) query.set("day", params.day)
  return `/calendar?${query.toString()}`
}
