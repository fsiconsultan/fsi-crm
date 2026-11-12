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

      <Card>
        <form action="/customers" role="search" className="mb-5 flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
            <label htmlFor="customer-search" className="text-sm font-medium">
              Find a customer
            </label>
            <input
              id="customer-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Name, phone, business or location"
              className={inputClass}
            />
          </div>
          <Button type="submit" variant="primary">
            <Search aria-hidden="true" className="size-4" />
            Search
          </Button>
          {query ? (
            <Link href="/customers" className={buttonClass("secondary")}>
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
