import Link from "next/link"
import { Search } from "lucide-react"
import { CustomerList } from "@/components/customers/customer-list"
import { PageHeader } from "@/components/shell/page-header"
import { Button, buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { inputClass } from "@/components/ui/field"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { CUSTOMER_PAGE_SIZE, listCustomers } from "@/lib/data/customers"

export const metadata = { title: "Customers" }

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function pageHref(query: string, page: number) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/customers?${search}` : "/customers"
}

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const params = await searchParams
  const query = (first(params.q) ?? "").trim()
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1)

  const result = await listCustomers({ query, page })
  const total = result.ok ? result.total : 0
  const pageCount = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE))

  return (
    <>
      <PageHeader title="Customers" />

      <Card className="max-md:p-4">
        {/* On a phone the search stays pinned under the 60px top bar while the list scrolls. */}
        <form
          action="/customers"
          role="search"
          className="sticky top-[60px] z-20 -mx-4 -mt-4 mb-3 flex items-end gap-2 rounded-t-[var(--radius-card)] border-b border-line bg-surface px-4 py-3 md:static md:mx-0 md:mt-0 md:mb-5 md:flex-wrap md:rounded-none md:border-0 md:p-0"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:basis-64">
            <label htmlFor="customer-search" className="sr-only text-sm font-medium md:not-sr-only">
              Find a customer
            </label>
            <input
              id="customer-search"
              name="q"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              defaultValue={query}
              placeholder="Name, phone, business or location"
              className={inputClass}
            />
          </div>
          <Button type="submit" variant="primary" className="max-md:min-w-11 max-md:px-3">
            <Search aria-hidden="true" className="size-4" />
            <span className="max-md:sr-only">Search</span>
          </Button>
          {query ? (
            <Link href="/customers" className={buttonClass("secondary", "max-md:px-3")}>
              Clear
            </Link>
          ) : null}
        </form>

        {!result.ok ? (
          <ErrorState
            title="The customer list could not be loaded"
            detail={`The server answered: ${result.message}. Check your connection and load the list again.`}
            action={
              <Link href={pageHref(query, page)} className={buttonClass("secondary")}>
                Load again
              </Link>
            }
          />
        ) : result.rows.length === 0 ? (
          query ? (
            <EmptyState
              title={`No customer matches "${query}"`}
              detail="Try part of the name, or the phone number exactly as it was typed in (with or without the leading 0). You only see customers assigned to you unless you are an Admin."
              action={
                <Link href="/customers" className={buttonClass("secondary")}>
                  Show all customers
                </Link>
              }
            />
          ) : page > 1 ? (
            <EmptyState
              title="There is no page here"
              detail="The list is shorter than this page number."
              action={
                <Link href="/customers" className={buttonClass("secondary")}>
                  Go to the first page
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No customers yet"
              detail="Customers appear here once a lead is assigned to you. Add or import leads from the Leads page."
              action={
                <Link href="/leads" className={buttonClass("secondary")}>
                  Open Leads
                </Link>
              }
            />
          )
        ) : (
          <>
            <p className="mb-3 text-[13px] tabular-nums text-muted" role="status">
              {query
                ? `${total.toLocaleString("en-US")} ${total === 1 ? "match" : "matches"} for "${query}"`
                : `${total.toLocaleString("en-US")} ${total === 1 ? "customer" : "customers"}`}
            </p>
            <CustomerList rows={result.rows} />

            {pageCount > 1 ? (
              <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] tabular-nums text-muted">
                  Page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link href={pageHref(query, page - 1)} className={buttonClass("secondary")}>
                      Previous
                    </Link>
                  ) : null}
                  {page < pageCount ? (
                    <Link href={pageHref(query, page + 1)} className={buttonClass("secondary")}>
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </Card>
    </>
  )
}
