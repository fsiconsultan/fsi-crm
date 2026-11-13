import { addDays, formatDay } from "./dates"
import { DEFAULT_SORT, LEAD_VIEWS, leadsHref, type LeadFilters, type LeadSort, type LeadView } from "./filters"
import { LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "./status"

// The tabs above the leads list. Each one is a preset of the two URL params
// `view` and `status`, built from the same views the Overview counts with, so a
// tab's number and the Needs you row it matches can never disagree.

export type QuickViewKey = "all" | "followup" | "stale" | "pipeline" | "none" | "deals"

export type QuickView = {
  key: QuickViewKey
  label: string
  view: LeadView | ""
  status: LeadFilters["status"]
  /** The order that answers the tab's question; others keep the current sort. */
  sort?: LeadSort
}

export const QUICK_VIEWS: QuickView[] = [
  { key: "all", label: "All", view: "", status: "" },
  { key: "followup", label: LEAD_VIEWS.followup, view: "followup", status: "", sort: "followup" },
  { key: "stale", label: LEAD_VIEWS.stale, view: "stale", status: "", sort: "longest" },
  { key: "pipeline", label: "In pipeline", view: "pipeline", status: "" },
  { key: "none", label: NO_STATUS_LABEL, view: "", status: "none" },
  { key: "deals", label: "Deals", view: "", status: "Deal" },
]

const TAB_SORTS = new Set(QUICK_VIEWS.flatMap((tab) => (tab.sort ? [tab.sort] : [])))

/** The filters that narrow every tab alike: everything except the tab's own params, sort and page. */
export function baseFilters(filters: LeadFilters): Omit<LeadFilters, "view" | "status" | "sort" | "page"> {
  return {
    q: filters.q,
    sales: filters.sales,
    type: filters.type,
    from: filters.from,
    to: filters.to,
    sfrom: filters.sfrom,
    sto: filters.sto,
  }
}

/** What a tab's count query and its list both read. */
export function quickViewWhere(tab: QuickView, filters: LeadFilters) {
  return { ...baseFilters(filters), view: tab.view, status: tab.status }
}

/** The tab whose preset the URL holds exactly, or null when a filter goes beyond it. */
export function activeQuickView(filters: LeadFilters): QuickView | null {
  return QUICK_VIEWS.find((tab) => tab.view === filters.view && tab.status === filters.status) ?? null
}

export function quickViewHref(tab: QuickView, filters: LeadFilters) {
  // A sort that came from another tab ("Follow-up, soonest first") goes back to the default.
  const sort = tab.sort ?? (TAB_SORTS.has(filters.sort) ? DEFAULT_SORT : filters.sort)
  return leadsHref({ ...filters, view: tab.view, status: tab.status, sort, page: 1 })
}

export const ADDED_DAYS = [7, 30, 90] as const

/** "Last 7 days" when `from` is that preset and there is no end day, else the dates. */
export function addedLabel(from: string, to: string, today: string) {
  if (!from && !to) return "Any time"
  const preset = ADDED_DAYS.find((days) => !to && from === addDays(today, -(days - 1)))
  if (preset) return `Last ${preset} days`
  const day = (value: string) => formatDay(value, value.slice(0, 4) !== today.slice(0, 4))
  if (from && to) return from === to ? day(from) : `${day(from)} to ${day(to)}`
  return from ? `Since ${day(from)}` : `Until ${day(to)}`
}

export function statusLabel(status: LeadFilters["status"]) {
  if (status === "none") return NO_STATUS_LABEL
  return isLeadStatus(status) ? LEAD_STATUS_SHORT[status] : ""
}

export type LeadChip = { key: string; label: string; removeHref: string }

/** The active filters, each with the link that removes only it. The tab's own preset is not repeated. */
export function leadChips(filters: LeadFilters, salesName: string | null, today: string): LeadChip[] {
  const without = (patch: Partial<LeadFilters>) => leadsHref({ ...filters, ...patch, page: 1 })
  const tab = activeQuickView(filters)
  const chips: LeadChip[] = []
  if (filters.q) chips.push({ key: "q", label: `Search: ${filters.q}`, removeHref: without({ q: "" }) })
  if (!tab && filters.view) {
    chips.push({ key: "view", label: LEAD_VIEWS[filters.view], removeHref: without({ view: "" }) })
  }
  if (!tab && filters.status) {
    chips.push({ key: "status", label: `Status: ${statusLabel(filters.status)}`, removeHref: without({ status: "" }) })
  }
  if (filters.sales) {
    chips.push({ key: "sales", label: salesName ?? "One salesperson", removeHref: without({ sales: "" }) })
  }
  if (filters.type) chips.push({ key: "type", label: filters.type, removeHref: without({ type: "" }) })
  if (filters.from || filters.to) {
    chips.push({
      key: "added",
      label: `Added: ${addedLabel(filters.from, filters.to, today)}`,
      removeHref: without({ from: "", to: "" }),
    })
  }
  if (filters.sfrom || filters.sto) {
    chips.push({
      key: "changed",
      label: `Status changed: ${addedLabel(filters.sfrom, filters.sto, today)}`,
      removeHref: without({ sfrom: "", sto: "" }),
    })
  }
  return chips
}
