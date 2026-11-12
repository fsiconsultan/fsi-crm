import Form from "next/form"
import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { Field, inputClass } from "@/components/ui/field"
import type { SalesUser } from "@/lib/data/leads"
import { formatDay } from "@/lib/leads/dates"
import { LEAD_SORTS, LEAD_VIEWS, hasActiveFilters, leadsHref, type LeadFilters } from "@/lib/leads/filters"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

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
  const scopes = [filters.view ? LEAD_VIEWS[filters.view] : null, statusRange].filter(Boolean)

  return (
    <Form action="/leads" className="mb-5 flex flex-col gap-4">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        <Field id="q" label="Search" className="col-span-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, phone or business"
            className={inputClass}
          />
        </Field>

        <Field id="status" label="Status">
          <select id="status" name="status" defaultValue={filters.status} className={inputClass}>
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
          <Field id="sales" label="Salesperson">
            <select id="sales" name="sales" defaultValue={filters.sales} className={inputClass}>
              <option value="">Everyone</option>
              {salesUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field id="type" label="Lead type">
          <select id="type" name="type" defaultValue={filters.type} className={inputClass}>
            <option value="">Any type</option>
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field id="from" label="Added from">
          <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClass} />
        </Field>

        <Field id="to" label="Added to">
          <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClass} />
        </Field>

        <Field id="sort" label="Sort by">
          <select id="sort" name="sort" defaultValue={filters.sort} className={inputClass}>
            {Object.entries(LEAD_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonClass("secondary")}>
          Apply filters
        </button>
        {hasActiveFilters(filters) ? (
          <Link href="/leads" className={buttonClass("ghost")}>
            Clear filters
          </Link>
        ) : null}
      </div>
    </Form>
  )
}
