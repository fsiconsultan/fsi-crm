import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states"
import { cn } from "@/lib/cn"
import { listLeads, type SalesUser } from "@/lib/data/leads"
import { PAGE_SIZE, hasActiveFilters, leadsHref, type LeadFilters } from "@/lib/leads/filters"
import { LEAD_GRID, LeadRow } from "./lead-row"

const number = new Intl.NumberFormat("en-US")

export async function LeadList({
  filters,
  salesUsers,
}: {
  filters: LeadFilters
  salesUsers: SalesUser[] | null
}) {
  const { rows, total } = await listLeads(filters)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const back = leadsHref(filters)

  if (total === 0) {
    return hasActiveFilters(filters) ? (
      <EmptyState
        title="No leads match these filters"
        detail="Nothing fits the search and filters above. Loosen one of them, or clear them to see every lead you have access to."
        action={
          <Link href="/leads" className={buttonClass("secondary")}>
            Clear filters
          </Link>
        }
      />
    ) : (
      <EmptyState
        title={salesUsers ? "There are no leads yet" : "No leads are assigned to you yet"}
        detail={
          salesUsers
            ? "Add the first lead and assign it to a salesperson. It shows up here and on their Overview."
            : "You only see leads assigned to you. Add one yourself, or ask an admin to assign existing leads to you."
        }
        action={
          <Link href="/leads/new" className={buttonClass("primary")}>
            Add a lead
          </Link>
        }
      />
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={`Page ${number.format(filters.page)} is past the end of the list`}
        detail={`These filters match ${number.format(total)} leads, which fill ${number.format(pages)} ${pages === 1 ? "page" : "pages"}.`}
        action={
          <Link href={leadsHref({ ...filters, page: pages })} className={buttonClass("secondary")}>
            Go to the last page
          </Link>
        }
      />
    )
  }

  const first = (filters.page - 1) * PAGE_SIZE + 1
  const owners = salesUsers ? new Map(salesUsers.map((user) => [user.id, user.name])) : null

  return (
    <>
      <p className="mb-2 text-[13px] text-muted">
        Showing {number.format(first)} to {number.format(first + rows.length - 1)} of {number.format(total)}{" "}
        {total === 1 ? "lead" : "leads"}
      </p>

      <div
        aria-hidden="true"
        className={cn("hidden border-b border-line pb-2 text-[13px] text-muted xl:grid", LEAD_GRID)}
      >
        <span>Customer</span>
        <span>{owners ? "WhatsApp, salesperson" : "WhatsApp"}</span>
        <span>Status</span>
        <span>Timing</span>
        <span />
      </div>

      <ul className="divide-y divide-line border-t border-line xl:border-t-0">
        {rows.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            owner={owners ? (owners.get(lead.sales_id ?? "") ?? "Unassigned") : undefined}
            editHref={`/leads/${lead.id}/edit?back=${encodeURIComponent(back)}`}
          />
        ))}
      </ul>

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-sm tabular-nums text-muted">
            Page {number.format(filters.page)} of {number.format(pages)}
          </p>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <PageLink href={filters.page > 1 ? leadsHref({ ...filters, page: filters.page - 1 }) : null}>
              Previous
            </PageLink>
            <PageLink href={filters.page < pages ? leadsHref({ ...filters, page: filters.page + 1 }) : null}>
              Next
            </PageLink>
          </div>
        </nav>
      ) : null}
    </>
  )
}

function PageLink({ href, children }: { href: string | null; children: string }) {
  return href ? (
    <Link href={href} className={buttonClass("secondary")}>
      {children}
    </Link>
  ) : (
    <span aria-disabled="true" className={buttonClass("secondary", "cursor-not-allowed opacity-50 hover:bg-surface")}>
      {children}
    </span>
  )
}
