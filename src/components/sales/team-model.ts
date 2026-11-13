import { leadsHref } from "@/lib/leads/filters"
import { SALES_ROLES } from "./roles"

// The Sales team page's rules, kept apart from React and the database so they
// can be tested: how people are sorted and filtered, how the workload bar is
// scaled, how waiting chats are grouped per person, and the /sales URL.

export const TEAM_PERIODS = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" } as const
export type TeamPeriodKey = keyof typeof TEAM_PERIODS
export const DEFAULT_TEAM_PERIOD: TeamPeriodKey = "30"
export const TEAM_PERIOD_KEYS: TeamPeriodKey[] = ["7", "30", "90"]

export const TEAM_SORTS = {
  open: "Most open leads",
  name: "Name, A to Z",
  overdue: "Most overdue",
} as const
export type TeamSort = keyof typeof TEAM_SORTS
export const DEFAULT_TEAM_SORT: TeamSort = "open"
export const TEAM_SORT_KEYS: TeamSort[] = ["open", "name", "overdue"]

export type TeamRole = (typeof SALES_ROLES)[number]

export type TeamParams = { period: TeamPeriodKey; sort: TeamSort; role: TeamRole | "" }

type RawParams = Record<string, string | string[] | undefined>

function first(raw: RawParams, key: string) {
  const value = raw[key]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

function isPeriod(value: string): value is TeamPeriodKey {
  return value in TEAM_PERIODS
}

function isSort(value: string): value is TeamSort {
  return value in TEAM_SORTS
}

export function isTeamRole(value: string): value is TeamRole {
  return (SALES_ROLES as readonly string[]).includes(value)
}

/** Unknown values fall back to the defaults instead of failing the page. */
export function parseTeamParams(raw: RawParams): TeamParams {
  const period = first(raw, "period")
  const sort = first(raw, "sort")
  const role = first(raw, "role")
  return {
    period: isPeriod(period) ? period : DEFAULT_TEAM_PERIOD,
    sort: isSort(sort) ? sort : DEFAULT_TEAM_SORT,
    role: isTeamRole(role) ? role : "",
  }
}

/** `/sales` with only the params that differ from the defaults. */
export function teamHref(params: Partial<TeamParams>, path = "/sales") {
  const all: TeamParams = { period: DEFAULT_TEAM_PERIOD, sort: DEFAULT_TEAM_SORT, role: "", ...params }
  const query = new URLSearchParams()
  if (all.period !== DEFAULT_TEAM_PERIOD) query.set("period", all.period)
  if (all.sort !== DEFAULT_TEAM_SORT) query.set("sort", all.sort)
  if (all.role) query.set("role", all.role)
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

/**
 * Every number on a person's row. Each one is a lead count with the same
 * definition the Overview and the Leads tabs use, so they always agree.
 */
export type PersonCounts = {
  /** Every lead assigned to them. */
  total: number
  /** Status is set and is not Deal or No deal. */
  open: number
  /** Moved to Deal in the period. */
  deals: number
  /** Added in the period. */
  added: number
  /** Follow-up date today or earlier on a lead that is still open. */
  followUpsDue: number
  /** Open and in the same status for over 14 days. */
  stale: number
}

export type TeamPerson = {
  id: string
  name: string
  username: string | null
  role: string | null
  status: string | null
  photoUrl: string | null
}

export type TeamRow = {
  person: TeamPerson
  counts: PersonCounts
  /** Null when WhatsApp is not set up, so the column is hidden instead of showing 0. */
  waitingChats: number | null
}

export function isInactive(person: Pick<TeamPerson, "status">) {
  return person.status === "Inactive"
}

const byName = (a: TeamRow, b: TeamRow) => a.person.name.localeCompare(b.person.name, "en", { sensitivity: "base" })

const COMPARE: Record<TeamSort, (a: TeamRow, b: TeamRow) => number> = {
  open: (a, b) => b.counts.open - a.counts.open || b.counts.total - a.counts.total || byName(a, b),
  name: byName,
  overdue: (a, b) =>
    b.counts.followUpsDue - a.counts.followUpsDue || b.counts.stale - a.counts.stale || COMPARE.open(a, b),
}

/** Active people first in the chosen order, then inactive people in the same order. */
export function sortTeam(rows: TeamRow[], sort: TeamSort): TeamRow[] {
  return [...rows].sort((a, b) => Number(isInactive(a.person)) - Number(isInactive(b.person)) || COMPARE[sort](a, b))
}

export function filterTeam(rows: TeamRow[], role: TeamRole | ""): TeamRow[] {
  return role ? rows.filter((row) => row.person.role === role) : rows
}

/** The largest number of assigned leads on the team: every bar is drawn against it. Never 0. */
export function loadScale(rows: Pick<TeamRow, "counts">[]) {
  return Math.max(1, ...rows.map((row) => row.counts.total))
}

/**
 * Bar width in percent of the team's largest load. A count above zero keeps a
 * 2% sliver so it never reads as empty next to the outlier.
 */
export function loadWidth(count: number, scale: number) {
  if (count <= 0 || scale <= 0) return 0
  return Math.max(2, Math.min(100, (count / scale) * 100))
}

/** The fields the inbox's `attentionOf` rule reads. */
export type ChatAttentionRow = {
  mode: string
  taken_over_by: string | null
  assigned_sales_id: string | null
  last_inbound_at: string | null
  last_message_at: string | null
}

type AttentionRule = (row: ChatAttentionRow, viewerId: string) => "handoff" | "reply" | null

/** Who a chat belongs to: whoever took it over, else whoever it is assigned to. */
export function chatOwner(row: Pick<ChatAttentionRow, "taken_over_by" | "assigned_sales_id">) {
  return row.taken_over_by ?? row.assigned_sales_id ?? null
}

/**
 * Chats waiting for a person, judged by the inbox's own rule as seen by the
 * chat's owner. A handoff nobody owns counts for the team but for no one person.
 */
export function groupWaitingChats(rows: ChatAttentionRow[], attentionOf: AttentionRule) {
  const byPerson: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    const owner = chatOwner(row)
    if (attentionOf(row, owner ?? "") === null) continue
    total += 1
    if (owner) byPerson[owner] = (byPerson[owner] ?? 0) + 1
  }
  return { total, byPerson }
}

/** The lists in /leads behind each number on a person's row. */
export function personLinks(id: string, range: { from: string; to: string }) {
  return {
    all: leadsHref({ sales: id }),
    open: leadsHref({ sales: id, view: "open" }),
    deals: leadsHref({ sales: id, status: "Deal", sfrom: range.from, sto: range.to }),
    added: leadsHref({ sales: id, from: range.from, to: range.to }),
    followUpsDue: leadsHref({ sales: id, view: "followup", sort: "followup" }),
    stale: leadsHref({ sales: id, view: "stale", sort: "longest" }),
  }
}
