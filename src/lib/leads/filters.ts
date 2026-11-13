import { isDay } from "./dates"
import { LEAD_TYPES, isLeadStatus, type LeadStatus } from "./status"

// The /leads URL is the contract between the leads table and every dashboard
// card that links into it, so both sides build and read it through this file.

export const PAGE_SIZE = 100

/** An open lead that has sat in one status longer than this counts as stuck. */
export const STALE_DAYS = 14

export const LEAD_SORTS = {
  newest: "Newest added",
  oldest: "Oldest added",
  followup: "Follow-up, soonest first",
  longest: "Longest in status",
  name: "Name, A to Z",
  name_desc: "Name, Z to A",
} as const

export const DEFAULT_SORT: LeadSort = "newest"

export type LeadSort = keyof typeof LEAD_SORTS

// Short labels: they appear on the quick-view tabs and the filter chips.
export const LEAD_VIEWS = {
  followup: "Follow-up due",
  stale: `Stuck over ${STALE_DAYS} days`,
  pipeline: "Has a status",
  open: "Open, not yet Deal or No deal",
  undated: "Status date missing",
} as const

export type LeadView = keyof typeof LEAD_VIEWS

export type LeadType = (typeof LEAD_TYPES)[number]

export type LeadFilters = {
  q: string
  status: LeadStatus | "none" | ""
  sales: string
  type: LeadType | ""
  /** Added (created_at) range, inclusive days. */
  from: string
  to: string
  /** Status changed (status_started_at) range, inclusive days. Set by dashboard links. */
  sfrom: string
  sto: string
  view: LeadView | ""
  sort: LeadSort
  page: number
}

export const DEFAULT_FILTERS: LeadFilters = {
  q: "",
  status: "",
  sales: "",
  type: "",
  from: "",
  to: "",
  sfrom: "",
  sto: "",
  view: "",
  sort: "newest",
  page: 1,
}

type RawParams = Record<string, string | string[] | undefined>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID.test(value)
}

function first(raw: RawParams, key: string) {
  const value = raw[key]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

/** Unknown or malformed values fall back to "no filter" instead of failing the page. */
export function parseLeadFilters(raw: RawParams): LeadFilters {
  const status = first(raw, "status")
  const sales = first(raw, "sales")
  const type = first(raw, "type")
  const view = first(raw, "view")
  const sort = first(raw, "sort")
  const page = Number.parseInt(first(raw, "page"), 10)
  const day = (key: string) => (isDay(first(raw, key)) ? first(raw, key) : "")

  return {
    q: first(raw, "q").slice(0, 80),
    status: status === "none" || isLeadStatus(status) ? status : "",
    sales: isUuid(sales) ? sales : "",
    type: (LEAD_TYPES as readonly string[]).includes(type) ? (type as LeadType) : "",
    from: day("from"),
    to: day("to"),
    sfrom: day("sfrom"),
    sto: day("sto"),
    view: view in LEAD_VIEWS ? (view as LeadView) : "",
    sort: sort in LEAD_SORTS ? (sort as LeadSort) : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function leadsHref(filters: Partial<LeadFilters> = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...DEFAULT_FILTERS, ...filters })) {
    if (value !== DEFAULT_FILTERS[key as keyof LeadFilters]) params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `/leads?${query}` : "/leads"
}

export function hasActiveFilters(filters: LeadFilters) {
  return leadsHref({ ...filters, sort: DEFAULT_SORT, page: 1 }) !== "/leads"
}
