import { addDays } from "@/lib/leads/dates"
import { STALE_DAYS, isUuid, leadsHref, type LeadFilters, type LeadType, type LeadView } from "@/lib/leads/filters"
import { LEAD_TYPES, type LeadStatus } from "@/lib/leads/status"

// The /pipeline URL holds every filter, so a filtered board survives a reload
// and can be linked. The page, the board's "Show more" and the filter bar all
// read and build it through this file.

export const ADDED_RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" } as const
export type AddedRange = keyof typeof ADDED_RANGES

export const MOVERS = { ai: "AI", person: "Person" } as const
export type MoverFilter = keyof typeof MOVERS

export type PipelineFilters = {
  q: string
  /** Admin only; everyone else is scoped by RLS. */
  sales: string
  type: LeadType | ""
  /** Who set the current status, by the same rule as the marker on the cards. */
  mover: MoverFilter | ""
  /** Added within the last N days, today included. */
  added: AddedRange | ""
  /** In an open status for more than STALE_DAYS days: the Overview's "leads stuck". */
  stuck: boolean
  /** Follow-up today or earlier on a lead still open: the Overview's "follow-ups due". */
  due: boolean
}

export const NO_FILTERS: PipelineFilters = { q: "", sales: "", type: "", mover: "", added: "", stuck: false, due: false }

type RawParams = Record<string, string | string[] | undefined>

function first(raw: RawParams, key: string) {
  const value = raw[key]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

function isLeadType(value: string): value is LeadType {
  return (LEAD_TYPES as readonly string[]).includes(value)
}

function isMover(value: string): value is MoverFilter {
  return value in MOVERS
}

function isAddedRange(value: string): value is AddedRange {
  return value in ADDED_RANGES
}

/** Unknown or malformed values fall back to "no filter" instead of failing the page. */
export function parsePipelineFilters(raw: RawParams): PipelineFilters {
  const sales = first(raw, "sales")
  const type = first(raw, "type")
  const mover = first(raw, "mover")
  const added = first(raw, "added")
  return {
    q: first(raw, "q").slice(0, 80),
    sales: isUuid(sales) ? sales : "",
    type: isLeadType(type) ? type : "",
    mover: isMover(mover) ? mover : "",
    added: isAddedRange(added) ? added : "",
    stuck: first(raw, "stuck") === "1",
    due: first(raw, "due") === "1",
  }
}

export function pipelineHref(filters: Partial<PipelineFilters> = {}) {
  const params = new URLSearchParams()
  const all = { ...NO_FILTERS, ...filters }
  if (all.q) params.set("q", all.q)
  if (all.sales) params.set("sales", all.sales)
  if (all.type) params.set("type", all.type)
  if (all.mover) params.set("mover", all.mover)
  if (all.added) params.set("added", all.added)
  if (all.stuck) params.set("stuck", "1")
  if (all.due) params.set("due", "1")
  const query = params.toString()
  return query ? `/pipeline?${query}` : "/pipeline"
}

export const STUCK_LABEL = `Stuck over ${STALE_DAYS} days`
export const DUE_LABEL = "Follow-up due"

export type FilterChip = { key: keyof PipelineFilters; label: string; removeHref: string }

/** The active filters, each with the link that removes only it. */
export function activeChips(filters: PipelineFilters, salesName: string | null): FilterChip[] {
  const chip = (key: keyof PipelineFilters, label: string): FilterChip => ({
    key,
    label,
    removeHref: pipelineHref({ ...filters, [key]: NO_FILTERS[key] }),
  })
  const chips: FilterChip[] = []
  if (filters.q) chips.push(chip("q", `Search: ${filters.q}`))
  if (filters.sales) chips.push(chip("sales", salesName ?? "One salesperson"))
  if (filters.type) chips.push(chip("type", filters.type))
  if (filters.mover) chips.push(chip("mover", `Moved last by ${MOVERS[filters.mover]}`))
  if (filters.added) chips.push(chip("added", `Added: ${ADDED_RANGES[filters.added].toLowerCase()}`))
  if (filters.stuck) chips.push(chip("stuck", STUCK_LABEL))
  if (filters.due) chips.push(chip("due", DUE_LABEL))
  return chips
}

/** The lead conditions for one column (or "none" for leads with no status), as the leads list reads them. */
export function leadWhere(filters: PipelineFilters, status: LeadStatus | "none", today: string) {
  const views: LeadView[] = []
  if (filters.stuck) views.push("stale")
  if (filters.due) views.push("followup")
  return {
    q: filters.q,
    sales: filters.sales,
    type: filters.type,
    status,
    from: filters.added ? addDays(today, -(Number(filters.added) - 1)) : "",
    views,
  }
}

/**
 * The /leads list for the leads with no status under the same filters. Null when
 * a filter cannot hold for a lead with no status (stuck needs an open status,
 * "moved last by" needs a status), so there is nothing to link to.
 */
export function noStatusHref(filters: PipelineFilters, today: string) {
  if (filters.stuck || filters.mover) return null
  const where = leadWhere(filters, "none", today)
  const list: Partial<LeadFilters> = { q: where.q, sales: where.sales, type: where.type, status: "none", from: where.from }
  return leadsHref(filters.due ? { ...list, view: "followup" } : list)
}
