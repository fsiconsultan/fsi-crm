import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { pillClass } from "@/components/ui/pill"
import { EmptyState } from "@/components/ui/states"
import { listLeads, type SalesUser } from "@/lib/data/leads"
import { PAGE_SIZE, STALE_DAYS, leadsHref, type LeadFilters } from "@/lib/leads/filters"
import { activeQuickView, baseFilters, type QuickViewKey } from "@/lib/leads/quick-views"
import { LeadCard, LeadTableRow, type LeadItemProps } from "./lead-row"

const number = new Intl.NumberFormat("en-US")

// What an empty tab means and the one thing that fills it.
const EMPTY_TAB: Record<Exclude<QuickViewKey, "all">, { title: string; detail: string }> = {
  followup: {
    title: "No follow-ups are due",
    detail: "Set a follow-up date on a customer to see it here on the day it is due.",
  },
  stale: {
    title: "No lead is stuck",
    detail: `A lead shows here when it stays in one open status for more than ${STALE_DAYS} days.`,
  },
  pipeline: {
    title: "No lead has a status yet",
    detail: "Open a customer and set a status to put them on the pipeline.",
  },
  none: {
    title: "Every lead has a status",
    detail: "New leads land here until someone sets their first status.",
  },
  deals: {
    title: "No deals yet",
    detail: "A lead shows here once its status is set to Deal.",
  },
}

export async function LeadList({
  filters,
  salesUsers,
}: {
  filters: LeadFilters
  salesUsers: SalesUser[] | null
}) {
  const { rows, total } = await listLeads(filters)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (total === 0) return <NoLeads filters={filters} admin={salesUsers !== null} />

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

  const back = encodeURIComponent(leadsHref(filters))
  const owners = salesUsers ? new Map(salesUsers.map((user) => [user.id, user.name])) : null
  const items: LeadItemProps[] = rows.map((lead) => {
    const editHref = `/leads/${lead.id}/edit?back=${back}`
    return {
      lead,
      owner: owners ? (owners.get(lead.sales_id ?? "") ?? "Unassigned") : undefined,
      editHref,
      reassignHref: owners ? `${editHref}#sales_id` : null,
    }
  })
  const first = (filters.page - 1) * PAGE_SIZE + 1

  return (
    <>
      <table className="hidden w-full table-fixed border-collapse text-left xl:table">
        <caption className="sr-only">
          Leads {number.format(first)} to {number.format(first + rows.length - 1)} of {number.format(total)}. Each name opens the customer.
        </caption>
        <colgroup>
          <col />
          <col className="w-[13.5rem]" />
          <col className="w-[10rem]" />
          {owners ? <col className="w-[11rem]" /> : null}
          <col className="w-[13rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[3.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="px-3 pb-2 pl-2 font-normal">Customer</th>
            <th scope="col" className="px-3 pb-2 font-normal">Phone</th>
            <th scope="col" className="px-3 pb-2 font-normal">Status</th>
            {owners ? <th scope="col" className="px-3 pb-2 font-normal">Salesperson</th> : null}
            <th scope="col" className="px-3 pb-2 font-normal">Next step</th>
            <th scope="col" className="px-3 pb-2 font-normal">Added</th>
            <th scope="col" className="px-3 pb-2 pr-2 font-normal">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <LeadTableRow key={item.lead.id} {...item} />
          ))}
        </tbody>
      </table>

      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:hidden">
        {items.map((item) => (
          <li key={item.lead.id} className="min-w-0">
            <LeadCard {...item} />
          </li>
        ))}
      </ul>

      <Pagination filters={filters} first={first} count={rows.length} total={total} pages={pages} />
    </>
  )
}

function NoLeads({ filters, admin }: { filters: LeadFilters; admin: boolean }) {
  const tab = activeQuickView(filters)

  if (!tab || Object.values(baseFilters(filters)).some(Boolean)) {
    return (
      <EmptyState
        title="No leads match these filters"
        detail="Nothing fits the search and filters above. Remove one of them, or clear them all to see every lead you have access to."
        action={
          <Link href="/leads" className={pillClass("tinted")}>
            Clear all
          </Link>
        }
      />
    )
  }

  if (tab.key !== "all") return <EmptyState {...EMPTY_TAB[tab.key]} />

  return (
    <EmptyState
      title={admin ? "There are no leads yet" : "No leads are assigned to you yet"}
      detail={
        admin
          ? "Add the first lead and assign it to a salesperson. It shows up here and on their Overview."
          : "You only see leads assigned to you. Add one yourself, or ask an admin to assign existing leads to you."
      }
      action={
        <Link href="/leads/new" className={pillClass("on")}>
          Add lead
        </Link>
      }
    />
  )
}

function Pagination({
  filters,
  first,
  count,
  total,
  pages,
}: {
  filters: LeadFilters
  first: number
  count: number
  total: number
  pages: number
}) {
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <p className="text-[13px] tabular-nums text-muted">
        {number.format(first)} to {number.format(first + count - 1)} of {number.format(total)}
      </p>
      {pages > 1 ? (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <PageLink href={filters.page > 1 ? leadsHref({ ...filters, page: filters.page - 1 }) : null}>Previous</PageLink>
          <PageLink href={filters.page < pages ? leadsHref({ ...filters, page: filters.page + 1 }) : null}>Next</PageLink>
        </div>
      ) : null}
    </nav>
  )
}

function PageLink({ href, children }: { href: string | null; children: string }) {
  if (!href) {
    return (
      <span aria-disabled="true" className={pillClass("tinted", "cursor-not-allowed justify-center opacity-50 hover:bg-line/70")}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={pillClass("tinted", "justify-center")}>
      {children}
    </Link>
  )
}
