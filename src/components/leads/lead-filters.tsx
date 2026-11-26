import { FilterBar, type FilterGroup } from "@/components/ui/filter-bar"
import type { SalesUser } from "@/lib/data/leads"
import { addDays } from "@/lib/leads/dates"
import { LEAD_SORTS, leadsHref, type LeadFilters, type LeadSort } from "@/lib/leads/filters"
import { ADDED_DAYS, addedLabel, leadChips, statusLabel } from "@/lib/leads/quick-views"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

const SORT_ORDER: LeadSort[] = ["newest", "oldest", "followup", "longest", "name", "name_desc"]

// The URL holds every filter, so a filtered list can be bookmarked, shared and
// reached from the Overview and Pipeline links. Each choice is a link that
// applies at once and returns to page 1.
export function LeadFilterBar({
  filters,
  salesUsers,
  today,
}: {
  filters: LeadFilters
  /** Only Admin can filter by salesperson; pass null for everyone else. */
  salesUsers: SalesUser[] | null
  today: string
}) {
  const href = (patch: Partial<LeadFilters>) => leadsHref({ ...filters, ...patch, page: 1 })
  const selected = salesUsers?.find((user) => user.id === filters.sales)

  const keep: Array<[string, string]> = []
  for (const [key, value] of new URLSearchParams(leadsHref({ ...filters, page: 1 }).split("?")[1] ?? "")) {
    if (key !== "q") keep.push([key, value])
  }

  const groups: FilterGroup[] = [
    {
      key: "status",
      name: "Status",
      text: filters.status ? `Status: ${statusLabel(filters.status)}` : "Any status",
      options: [
        { label: "Any status", href: href({ status: "" }), checked: !filters.status },
        ...LEAD_STATUSES.map((status) => ({
          label: LEAD_STATUS_SHORT[status],
          href: href({ status }),
          checked: filters.status === status,
        })),
        { label: NO_STATUS_LABEL, href: href({ status: "none" }), checked: filters.status === "none" },
      ],
    },
  ]

  if (salesUsers) {
    groups.push({
      key: "sales",
      name: "Salesperson",
      text: selected?.name ?? "Whole team",
      options: [
        { label: "Whole team", href: href({ sales: "" }), checked: !selected },
        ...salesUsers.map((user) => ({
          label: user.name,
          href: href({ sales: user.id }),
          checked: user.id === selected?.id,
        })),
      ],
    })
  }

  groups.push({
    key: "type",
    name: "Lead type",
    text: filters.type || "Any type",
    options: [
      { label: "Any type", href: href({ type: "" }), checked: !filters.type },
      ...LEAD_TYPES.map((type) => ({ label: type, href: href({ type }), checked: filters.type === type })),
    ],
  })

  const added = addedLabel(filters.from, filters.to, today)
  groups.push({
    key: "added",
    name: "Added",
    text: filters.from || filters.to ? `Added: ${added}` : "Added any time",
    options: [
      { label: "Any time", href: href({ from: "", to: "" }), checked: !filters.from && !filters.to },
      ...ADDED_DAYS.map((days) => ({
        label: `Last ${days} days`,
        href: href({ from: addDays(today, -(days - 1)), to: "" }),
        checked: added === `Last ${days} days`,
      })),
    ],
    range: {
      from: filters.from,
      to: filters.to,
      names: ["from", "to"],
      keep: keep.filter(([key]) => key !== "from" && key !== "to").concat(filters.q ? [["q", filters.q]] : []),
    },
  })

  const sort: FilterGroup = {
    key: "sort",
    name: "Sort",
    text: LEAD_SORTS[filters.sort],
    options: SORT_ORDER.map((key) => ({
      label: LEAD_SORTS[key],
      href: href({ sort: key }),
      checked: filters.sort === key,
    })),
  }

  return (
    <FilterBar
      action="/leads"
      q={filters.q}
      searchLabel="Search leads by name, phone or business"
      keep={keep}
      groups={groups}
      sort={sort}
      chips={leadChips(filters, selected?.name ?? null, today)}
      clearHref="/leads"
      doneLabel="Show leads"
    />
  )
}
