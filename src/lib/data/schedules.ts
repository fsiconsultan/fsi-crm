import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import { addDays, dayStart, today } from "@/lib/leads/dates"
import { toScheduleView } from "@/lib/schedules/view"
import type { ScheduleStatus, ScheduleView } from "@/lib/schedules/types"
import { createClient } from "@/lib/supabase/server"

// Schedule loaders, run as the signed-in user so RLS limits the rows: Admin
// sees all; others see schedules on their own leads that are theirs or
// unassigned. When the migration is not applied yet, `setUp` is false instead
// of an error, so pages can say "not set up yet".
//
// Staff views work in office days: "today", ranges and grouping are Bali
// (WITA) days (`ScheduleView.officeDay`). Each item still carries its own zone
// and local times (`timeZone`, `zoneLabel`, `day`, `startTime`, `endTime`)
// for showing what the customer was told.

/** PGRST205 / 42P01: the table does not exist yet. */
function notSetUp(error: PostgrestError) {
  return error.code === "PGRST205" || error.code === "42P01"
}

export type LeadSchedules = {
  setUp: boolean
  /** Scheduled, from the start of today's office (WITA) day on, soonest first. */
  upcoming: ScheduleView[]
  /** Still scheduled but before today: needs "done" or "cancel". Most recent first. */
  overdue: ScheduleView[]
  /** Done or cancelled, most recent first (at most 50). */
  past: ScheduleView[]
}

export async function getLeadSchedules(leadId: number): Promise<LeadSchedules> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("lead_schedules")
    .select("*")
    .eq("lead_id", leadId)
    .order("starts_at", { ascending: true })
    .limit(500)
  if (error) {
    if (notSetUp(error)) return { setUp: false, upcoming: [], overdue: [], past: [] }
    throw new Error(`Loading the schedule failed: ${error.message}`)
  }

  const from = Date.parse(dayStart(today()))
  const views = data.map(toScheduleView)
  const byRecent = (a: ScheduleView, b: ScheduleView) => b.startsAt.localeCompare(a.startsAt)
  return {
    setUp: true,
    upcoming: views.filter((item) => item.status === "scheduled" && Date.parse(item.startsAt) >= from),
    overdue: views.filter((item) => item.status === "scheduled" && Date.parse(item.startsAt) < from).sort(byRecent),
    past: views.filter((item) => item.status !== "scheduled").sort(byRecent).slice(0, 50),
  }
}

export type ScheduleRangeQuery = {
  /** First office (WITA) day, YYYY-MM-DD (inclusive). */
  from: string
  /** Last office (WITA) day, YYYY-MM-DD (inclusive). */
  to: string
  /** Narrow to one salesperson (sales_users.id). Empty: everyone RLS allows. */
  salesId?: string
  /** Default: only scheduled. */
  statuses?: ScheduleStatus[]
}

export type ScheduleRange = { setUp: boolean; items: ScheduleView[] }

/** Items whose start falls on an office (WITA) day in [from, to] (`officeDay`), soonest first (at most 1000). */
export async function listSchedulesInRange(query: ScheduleRangeQuery): Promise<ScheduleRange> {
  const supabase = await createClient()
  let request = supabase
    .from("lead_schedules")
    .select("*")
    .gte("starts_at", dayStart(query.from))
    .lt("starts_at", dayStart(addDays(query.to, 1)))
    .in("status", query.statuses?.length ? query.statuses : ["scheduled"])
  if (query.salesId) request = request.eq("sales_id", query.salesId)

  const { data, error } = await request.order("starts_at", { ascending: true }).limit(1000)
  if (error) {
    if (notSetUp(error)) return { setUp: false, items: [] }
    throw new Error(`Loading the schedule failed: ${error.message}`)
  }
  return { setUp: true, items: data.map(toScheduleView) }
}

/** One schedule, or null when it does not exist, is not visible, or the table is not set up. */
export async function getScheduleById(id: string): Promise<ScheduleView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("lead_schedules").select("*").eq("id", id).maybeSingle()
  if (error) {
    if (notSetUp(error)) return null
    throw new Error(`Loading the schedule failed: ${error.message}`)
  }
  return data ? toScheduleView(data) : null
}
