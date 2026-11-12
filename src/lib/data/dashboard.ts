import "server-only"
import { addDays, formatDay, today, weekStart } from "@/lib/leads/dates"
import { LEAD_STATUSES, OPEN_STATUSES, type LeadStatus } from "@/lib/leads/status"
import { createClient } from "@/lib/supabase/server"
import { countLeads, recentLeads, type Lead, type SalesUser } from "./leads"

export const PERIODS = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
} as const

export type PeriodKey = keyof typeof PERIODS

export const DEFAULT_PERIOD: PeriodKey = "30"

export const WEEKS_SHOWN = 12

export type Period = {
  key: PeriodKey
  label: string
  days: number
  /** Inclusive Bali days. */
  from: string
  to: string
  prevFrom: string
  prevTo: string
  rangeLabel: string
}

export function resolvePeriod(key: string | undefined): Period {
  const periodKey = key && key in PERIODS ? (key as PeriodKey) : DEFAULT_PERIOD
  const days = Number(periodKey)
  const to = today()
  const from = addDays(to, -(days - 1))
  return {
    key: periodKey,
    label: PERIODS[periodKey],
    days,
    from,
    to,
    prevFrom: addDays(from, -days),
    prevTo: addDays(from, -1),
    rangeLabel: `${formatDay(from)} to ${formatDay(to, true)}`,
  }
}

export type TeamRow = { user: SalesUser; total: number; open: number; deals: number }

export type Dashboard = {
  total: number
  byStatus: Record<LeadStatus, number>
  noStatus: number
  open: number
  deals: { now: number; previous: number }
  noDeals: { now: number }
  added: { now: number; previous: number }
  weeks: Array<{ start: string; count: number; current: boolean }>
  followUpsDue: number
  stale: number
  siteSurveys: number
  recent: Lead[]
  team: TeamRow[] | null
}

// Every number is a count query run as the signed-in user, so RLS decides the
// scope and no lead rows leave the database except the handful of recent ones.
export async function getDashboard(options: {
  period: Period
  salesId: string
  team: SalesUser[] | null
}): Promise<Dashboard> {
  const { period, salesId, team } = options
  const base = { sales: salesId }
  const thisWeek = weekStart(today())

  const weekStarts = Array.from({ length: WEEKS_SHOWN }, (_, index) =>
    addDays(thisWeek, -7 * (WEEKS_SHOWN - 1 - index)),
  )

  const [
    total,
    statusCounts,
    noStatus,
    dealsNow,
    dealsPrevious,
    noDealsNow,
    addedNow,
    addedPrevious,
    weekCounts,
    followUpsDue,
    stale,
    siteSurveys,
    recent,
    teamRows,
  ] = await Promise.all([
    countLeads(base),
    Promise.all(LEAD_STATUSES.map((status) => countLeads({ ...base, status }))),
    countLeads({ ...base, status: "none" }),
    countLeads({ ...base, status: "Deal", sfrom: period.from, sto: period.to }),
    countLeads({ ...base, status: "Deal", sfrom: period.prevFrom, sto: period.prevTo }),
    countLeads({ ...base, status: "No Deal", sfrom: period.from, sto: period.to }),
    countLeads({ ...base, from: period.from, to: period.to }),
    countLeads({ ...base, from: period.prevFrom, to: period.prevTo }),
    Promise.all(weekStarts.map((start) => countLeads({ ...base, from: start, to: addDays(start, 6) }))),
    countLeads({ ...base, view: "followup" }),
    countLeads({ ...base, view: "stale" }),
    countSiteSurveys(salesId),
    recentLeads(base, 6),
    team
      ? Promise.all(
          team.map(async (user) => {
            const [userTotal, open, deals] = await Promise.all([
              countLeads({ sales: user.id }),
              countLeads({ sales: user.id, view: "open" }),
              countLeads({ sales: user.id, status: "Deal", sfrom: period.from, sto: period.to }),
            ])
            return { user, total: userTotal, open, deals }
          }),
        )
      : null,
  ])

  const byStatus = Object.fromEntries(
    LEAD_STATUSES.map((status, index) => [status, statusCounts[index]]),
  ) as Record<LeadStatus, number>

  return {
    total,
    byStatus,
    noStatus,
    open: OPEN_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    deals: { now: dealsNow, previous: dealsPrevious },
    noDeals: { now: noDealsNow },
    added: { now: addedNow, previous: addedPrevious },
    weeks: weekStarts.map((start, index) => ({
      start,
      count: weekCounts[index],
      current: start === thisWeek,
    })),
    followUpsDue,
    stale,
    siteSurveys,
    recent,
    team: teamRows,
  }
}

// The current CRM's "Site Survey" card counts leads with a site survey date,
// which is not one of the lead filters, so it gets its own count.
async function countSiteSurveys(salesId: string) {
  const supabase = await createClient()
  let query = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not("site_survey", "is", null)
  if (salesId) query = query.eq("sales_id", salesId)
  const { count, error } = await query
  if (error) throw new Error(`Counting site surveys failed: ${error.message}`)
  return count ?? 0
}
