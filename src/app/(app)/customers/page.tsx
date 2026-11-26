import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft, ChevronRight, ListTodo } from "lucide-react"
import { CustomerFilterBar, type SalesChoice } from "@/components/customers/customer-filters"
import { CustomerList } from "@/components/customers/customer-list"
import { customersHref, isFiltered, parseCustomerFilters, type CustomerFilters } from "@/components/customers/filters"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { pillClass } from "@/components/ui/pill"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { CUSTOMER_PAGE_SIZE, listCustomers, type CustomerList as Result } from "@/lib/data/customers"
import { listSalesOptions } from "@/lib/data/sales-users"

export const metadata = { title: "Customers" }

const n = (value: number) => value.toLocaleString("en-US")

function countLine(total: number, filtered: boolean) {
  if (filtered) return `${n(total)} ${total === 1 ? "customer matches" : "customers match"}`
  return `${n(total)} ${total === 1 ? "customer" : "customers"}`
}

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const filters = parseCustomerFilters(await searchParams)
  const profile = await getProfile()
  const admin = isAdmin(profile)

  const [result, salesOptions] = await Promise.all([
    listCustomers(filters, admin),
    admin ? listSalesOptions() : null,
  ])
  // A page number past the end (an old link, or a search that now has fewer
  // results) goes back to the first page instead of claiming there are no matches.
  if (result.ok && result.rows.length === 0 && filters.page > 1) redirect(customersHref({ ...filters, page: 1 }))

  // When the team list fails, the salesperson pill is left out rather than shown empty.
  const sales: SalesChoice[] | null = salesOptions?.ok
    ? salesOptions.options.map((option) => ({
        id: option.id,
        name: `${option.name ?? option.username ?? "Unnamed user"}${option.status === "Inactive" ? " (inactive)" : ""}`,
      }))
    : null

  return (
    <>
      <PageHeader
        title="Customers"
        meta={result.ok ? countLine(result.total, isFiltered(filters)) : undefined}
        actions={
          <Link href="/leads" className={pillClass("tinted")}>
            <ListTodo aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Work queue in Leads
          </Link>
        }
      />

      <CustomerFilterBar filters={filters} sales={sales} />

      <ListBody result={result} filters={filters} admin={admin} />
    </>
  )
}

function ListBody({ result, filters, admin }: { result: Result; filters: CustomerFilters; admin: boolean }) {
  if (!result.ok) {
    return (
      <Card>
        <ErrorState
          title="The customer list could not be loaded"
          detail={`The server answered: ${result.message}. Nothing was changed. Check your connection and load the list again.`}
          action={
            <Link href={customersHref(filters)} className={buttonClass("secondary")}>
              Load again
            </Link>
          }
        />
      </Card>
    )
  }

  if (result.rows.length === 0) {
    return (
      <Card>
        <NoRows filters={filters} />
      </Card>
    )
  }

  const pageCount = Math.max(1, Math.ceil(result.total / CUSTOMER_PAGE_SIZE))
  return (
    <>
      <section aria-label="Customers" className="md:rounded-[var(--radius-card)] md:border md:border-line md:bg-surface md:p-3">
        <CustomerList rows={result.rows} admin={admin} />
      </section>
      <Pagination filters={filters} pageCount={pageCount} total={result.total} />
    </>
  )
}

function NoRows({ filters }: { filters: CustomerFilters }) {
  if (isFiltered(filters)) {
    const others = isFiltered({ ...filters, q: "" })
    const title = filters.q
      ? `No customer matches "${filters.q}"${others ? " with these filters" : ""}`
      : "No customer matches these filters"
    const hint = filters.q ? "Try part of the name or number" : "Turn a filter off to see more"
    return (
      <EmptyState
        title={title}
        detail={`${hint}. You only see customers assigned to you unless you are an Admin.`}
        action={
          <Link href="/customers" className={buttonClass("secondary")}>
            Show all customers
          </Link>
        }
      />
    )
  }
  return (
    <EmptyState
      title="No customers yet"
      detail="A customer appears here once a lead is added and assigned to you. Add or import leads on the Leads page."
      action={
        <Link href="/leads" className={buttonClass("secondary")}>
          Open Leads
        </Link>
      }
    />
  )
}

function Pagination({ filters, pageCount, total }: { filters: CustomerFilters; pageCount: number; total: number }) {
  if (pageCount <= 1) return null
  const first = (filters.page - 1) * CUSTOMER_PAGE_SIZE + 1
  const last = Math.min(total, filters.page * CUSTOMER_PAGE_SIZE)
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] tabular-nums text-muted">
        {n(first)} to {n(last)} of {n(total)}, page {filters.page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {filters.page > 1 ? (
          <Link href={customersHref({ ...filters, page: filters.page - 1 })} className={pillClass("tinted")}>
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Previous
          </Link>
        ) : null}
        {filters.page < pageCount ? (
          <Link href={customersHref({ ...filters, page: filters.page + 1 })} className={pillClass("tinted")}>
            Next
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>
    </nav>
  )
}
