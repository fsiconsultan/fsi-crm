import Form from "next/form"
import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { controlClass } from "@/components/ui/control"
import { Field } from "@/components/ui/field"
import type { SalesUser } from "@/lib/data/leads"
import { formatDay } from "@/lib/leads/dates"
import { LEAD_SORTS, LEAD_VIEWS, hasActiveFilters, leadsHref, type LeadFilters } from "@/lib/leads/filters"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"
import { FilterDisclosure } from "./filter-disclosure"

// A plain GET form: the URL holds every filter, so a filtered list can be
// bookmarked, shared and reached from dashboard links.
export function LeadFilterBar({
  filters,
  salesUsers,
}: {
  filters: LeadFilters
  /** Only Admin can filter by salesperson; pass null for everyone else. */
  salesUsers: SalesUser[] | null
}) {
  const statusRange =
    filters.sfrom || filters.sto
      ? `Status changed ${filters.sfrom ? `from ${formatDay(filters.sfrom, true)}` : ""} ${
          filters.sto ? `to ${formatDay(filters.sto, true)}` : ""
        }`.replace(/\s+/g, " ")
      : null
  const active = hasActiveFilters(filters)
  // What the folded panel holds; the search box and the dashboard scope are visible without it.
  const activeCount = [filters.status, filters.sales, filters.type, filters.from, filters.to].filter(Boolean).length
  const scopes = [filters.view ? LEAD_VIEWS[filters.view] : null, statusRange].filter(Boolean)

  return (
    <Form action="/leads" className="mb-5 flex flex-col gap-3 md:gap-4">
      {filters.view ? <input type="hidden" name="view" value={filters.view} /> : null}
      {filters.sfrom ? <input type="hidden" name="sfrom" value={filters.sfrom} /> : null}
      {filters.sto ? <input type="hidden" name="sto" value={filters.sto} /> : null}

      {scopes.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-control)] bg-accent-soft px-4 py-2 text-sm text-ink">
          <span>
            <span className="font-medium">Showing only:</span> {scopes.join(", ")}.
          </span>
          <Link
            href={leadsHref({ ...filters, view: "", sfrom: "", sto: "", page: 1 })}
            className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 md:min-h-8"
          >
            Show all leads instead
          </Link>
        </p>
      ) : null}

      <div className="flex gap-2 md:max-w-xl">
        <label htmlFor="q" className="sr-only">
          Search leads by name, phone or business
        </label>
        <input
          id="q"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={filters.q}
          placeholder="Name, phone, business"
          className={`${controlClass} min-w-0 flex-1`}
        />
        <button type="submit" className={buttonClass("secondary", "shrink-0")}>
          Search
        </button>
      </div>

      <FilterDisclosure
        activeCount={activeCount}
        mobileExtra={
          active ? (
            <Link href="/leads" className={buttonClass("ghost")}>
              Clear all
            </Link>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          <Field htmlFor="status" label="Status">
            <select id="status" name="status" defaultValue={filters.status} className={controlClass}>
              <option value="">Any status</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_SHORT[status]}
                </option>
              ))}
              <option value="none">{NO_STATUS_LABEL}</option>
            </select>
          </Field>

          {salesUsers ? (
            <Field htmlFor="sales" label="Salesperson">
              <select id="sales" name="sales" defaultValue={filters.sales} className={controlClass}>
                <option value="">Everyone</option>
                {salesUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field htmlFor="type" label="Lead type">
            <select id="type" name="type" defaultValue={filters.type} className={controlClass}>
              <option value="">Any type</option>
              {LEAD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="from" label="Added from">
            <input id="from" name="from" type="date" defaultValue={filters.from} className={controlClass} />
          </Field>

          <Field htmlFor="to" label="Added to">
            <input id="to" name="to" type="date" defaultValue={filters.to} className={controlClass} />
          </Field>

          <Field htmlFor="sort" label="Sort by" className={salesUsers ? undefined : "max-md:col-span-2"}>
            <select id="sort" name="sort" defaultValue={filters.sort} className={controlClass}>
              {Object.entries(LEAD_SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={buttonClass("secondary", "max-md:flex-1")}>
            Apply filters
          </button>
          {active ? (
            <Link href="/leads" className={buttonClass("ghost", "max-md:hidden")}>
              Clear filters
            </Link>
          ) : null}
        </div>
      </FilterDisclosure>
    </Form>
  )
}
