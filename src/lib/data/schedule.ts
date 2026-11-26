import "server-only"
import {
  groupByDay,
  mergeScheduled,
  scheduleWindow,
  type ScheduleDay,
  type ScheduleItem,
} from "@/components/dashboard/schedule"
import { listSchedulesInRange } from "@/lib/data/schedules"
import { today } from "@/lib/leads/dates"
import { createClient } from "@/lib/supabase/server"

const COLUMNS = "id, customer_name, sales_id, status, appointment, site_survey, follow_up_date"

/** Overdue follow-ups listed on the card; the rest are one link away. */
export const OVERDUE_SHOWN = 5

export type Schedule = {
  window: { from: string; to: string }
  days: ScheduleDay[]
  /** Follow-ups before today on leads still open, most recently due first. */
  overdue: { items: ScheduleItem[]; total: number }
}

/**
 * What is coming up, from the date columns leads already have: appointment,
 * site_survey and follow_up_date. (quotation and closing record when something
 * happened; the legacy app shows them as past milestones, so they are not
 * scheduled dates.) Plus the scheduled items in lead_schedules, without the
 * column dates that only mirror one of them (see `mergeScheduled`). Runs as
 * the signed-in user: RLS scopes the rows, and `salesId` narrows further for
 * Admin (the lead's salesperson for column dates, the schedule's for
 * lead_schedules items). lead_schedules items are grouped by their office
 * (WITA) day and also carry their own zone and local time.
 */
export async function getSchedule(salesId: string): Promise<Schedule> {
  const supabase = await createClient()
  const window = scheduleWindow(today())
  const inWindow = (column: string) => `and(${column}.gte.${window.from},${column}.lte.${window.to})`

  let upcoming = supabase
    .from("leads")
    .select(COLUMNS)
    .or([inWindow("appointment"), inWindow("site_survey"), inWindow("follow_up_date")].join(","))
  let overdue = supabase
    .from("leads")
    .select(COLUMNS, { count: "exact" })
    .lt("follow_up_date", window.from)
    .or('status.is.null,status.not.in.("Deal","No Deal")')
  if (salesId) {
    upcoming = upcoming.eq("sales_id", salesId)
    overdue = overdue.eq("sales_id", salesId)
  }

  const [upcomingResult, overdueResult, scheduled] = await Promise.all([
    upcoming.order("id", { ascending: true }).limit(1000),
    overdue.order("follow_up_date", { ascending: false }).order("id", { ascending: true }).limit(OVERDUE_SHOWN),
    listSchedulesInRange({ from: window.from, to: window.to, salesId: salesId || undefined }),
  ])
  if (upcomingResult.error) throw new Error(`Loading the schedule failed: ${upcomingResult.error.message}`)
  if (overdueResult.error) throw new Error(`Loading overdue follow-ups failed: ${overdueResult.error.message}`)

  // Names for schedule items whose lead has no column date in the window.
  const names = new Map<number, string | null>(upcomingResult.data.map((row) => [row.id, row.customer_name]))
  const missing = [
    ...new Set(scheduled.items.flatMap((item) => (item.leadId !== null && !names.has(item.leadId) ? [item.leadId] : []))),
  ]
  if (missing.length) {
    const { data, error } = await supabase.from("leads").select("id, customer_name").in("id", missing)
    if (error) throw new Error(`Loading the schedule failed: ${error.message}`)
    for (const row of data) names.set(row.id, row.customer_name)
  }

  return {
    window,
    days: mergeScheduled(groupByDay(upcomingResult.data, window), scheduled.items, names, window),
    overdue: {
      items: overdueResult.data.flatMap((row) =>
        row.follow_up_date
          ? [
              {
                type: "follow_up" as const,
                leadId: row.id,
                name: row.customer_name,
                salesId: row.sales_id,
                day: row.follow_up_date.slice(0, 10),
              },
            ]
          : [],
      ),
      total: overdueResult.count ?? 0,
    },
  }
}
