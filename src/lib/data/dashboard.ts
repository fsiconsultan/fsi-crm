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

// The leads that existed before this CRM were loaded in bulk: 2,138 on 18 and
// 19 Sep, 552 on 25 Sep and 100 on 2 Oct 2026 (live data: rows with no
// created_by, each batch written within a minute or two). Leads "added" on or
// before this day are mostly that import, not new leads, so the weekly chart
// starts after it and period comparisons that reach back to it are not shown.
export const LEAD_IMPORT_LAST_DAY = "2026-10-02"

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
  /** "14 Oct to 12 Nov": the header date chip. */
  shortRange: string
  /** The period before, same format: the chip's "vs" text. */
  prevShortRange: string
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
    shortRange: `${formatDay(from)} to ${formatDay(to)}`,
    prevShortRange: `${formatDay(addDays(from, -days))} to ${formatDay(addDays(from, -1))}`,
  }
}

export type TeamRow = { user: SalesUser; total: number; open: number; deals: number }

export type Dashboard = {
  total: number
  byStatus: Record<LeadStatus, number>
  noStatus: number
  open: number
  deals: { now: number; previous: number }
  noDeals: { now: number; previous: number }
  added: {
    now: number
    /** Null when the period before reaches back to the import, so a comparison would mislead. */
    previous: number | null
    /** The period itself reaches back to the import. */
    includesImport: boolean
  }
  /** Leads with Deal or No deal but no status date; they fall in no period. */
  closedUndated: { deals: number; noDeals: number }
  /** Weeks after the import only, oldest first, at most WEEKS_SHOWN. */
  weeks: Array<{ start: string; count: number; current: boolean }>
  /** True when earlier weeks were left out because they hold the import. */
  weeksAfterImport: boolean
  followUpsDue: number
  stale: number
  undated: number
  siteSurveys: number
  recent: Lead[]
  team: TeamRow[] | null
}

/** The counts behind the Needs you card. */
export type NeedsYou = Pick<Dashboard, "followUpsDue" | "stale" | "undated" | "noStatus">

// The non-admin Overview shows only Needs you from this file, so it runs these
// four counts instead of the whole dashboard. RLS scopes them to the viewer's leads.
export async function getNeedsYou(): Promise<NeedsYou> {
  const [followUpsDue, stale, undated, noStatus] = await Promise.all([
    countLeads({ view: "followup" }),
    countLeads({ view: "stale" }),
    countLeads({ view: "undated" }),
    countLeads({ status: "none" }),
  ])
  return { followUpsDue, stale, undated, noStatus }
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

  const allWeekStarts = Array.from({ length: WEEKS_SHOWN }, (_, index) =>
    addDays(thisWeek, -7 * (WEEKS_SHOWN - 1 - index)),
  )
  const weekStarts = allWeekStarts.filter((start) => start > LEAD_IMPORT_LAST_DAY)
  const comparePrevious = period.prevFrom > LEAD_IMPORT_LAST_DAY

  const [
    total,
    statusCounts,
    noStatus,
    dealsNow,
    dealsPrevious,
    noDealsNow,
    noDealsPrevious,
    addedNow,
    addedPrevious,
    dealsUndated,
    noDealsUndated,
    weekCounts,
    followUpsDue,
    stale,
    undated,
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
    countLeads({ ...base, status: "No Deal", sfrom: period.prevFrom, sto: period.prevTo }),
    countLeads({ ...base, from: period.from, to: period.to }),
    comparePrevious ? countLeads({ ...base, from: period.prevFrom, to: period.prevTo }) : null,
    countLeads({ ...base, status: "Deal", view: "undated" }),
    countLeads({ ...base, status: "No Deal", view: "undated" }),
    Promise.all(weekStarts.map((start) => countLeads({ ...base, from: start, to: addDays(start, 6) }))),
    countLeads({ ...base, view: "followup" }),
    countLeads({ ...base, view: "stale" }),
    countLeads({ ...base, view: "undated" }),
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
    noDeals: { now: noDealsNow, previous: noDealsPrevious },
    added: { now: addedNow, previous: addedPrevious, includesImport: period.from <= LEAD_IMPORT_LAST_DAY },
    closedUndated: { deals: dealsUndated, noDeals: noDealsUndated },
    weeks: weekStarts.map((start, index) => ({
      start,
      count: weekCounts[index],
      current: start === thisWeek,
    })),
    weeksAfterImport: weekStarts.length < allWeekStarts.length,
    followUpsDue,
    stale,
    undated,
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
