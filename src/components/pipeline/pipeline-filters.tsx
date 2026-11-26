import type { FilterOption } from "@/components/dashboard/dashboard-filters"
import { FilterBar, type FilterChip, type FilterGroup } from "@/components/ui/filter-bar"
import type { PipelineFilters } from "@/lib/pipeline/filters"

export type { FilterGroup }

/**
 * The Pipeline page's filter bar (DESIGN.md "Pipeline page"): the shared pill
 * filter bar with the board's search params and its two toggles.
 */
export function PipelineFilterBar({
  filters,
  groups,
  toggles,
  chips,
}: {
  filters: PipelineFilters
  groups: FilterGroup[]
  toggles: FilterOption[]
  chips: FilterChip[]
}) {
  const keep: Array<[string, string]> = []
  if (filters.sales) keep.push(["sales", filters.sales])
  if (filters.type) keep.push(["type", filters.type])
  if (filters.mover) keep.push(["mover", filters.mover])
  if (filters.added) keep.push(["added", filters.added])
  if (filters.stuck) keep.push(["stuck", "1"])
  if (filters.due) keep.push(["due", "1"])

  return (
    <div className="mb-3">
      <FilterBar
        action="/pipeline"
        q={filters.q}
        searchLabel="Search the board by name, phone or business"
        keep={keep}
        groups={groups}
        toggles={toggles}
        chips={chips}
        clearHref="/pipeline"
        doneLabel="Show the board"
      />
    </div>
  )
}
