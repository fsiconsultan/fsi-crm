import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { CustomerProfile } from "@/components/customers/customer-profile"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { getCustomer, parseCustomerId } from "@/lib/data/customers"
import { listDocuments } from "@/lib/data/documents"
import { listSalesOptions } from "@/lib/data/sales-users"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Customer" }

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id: rawId } = await params
  const id = parseCustomerId(rawId)
  if (id === null) notFound()

  const profile = await getProfile()
  const admin = isAdmin(profile)

  const [result, documents, salesOptions] = await Promise.all([
    getCustomer(id),
    createClient().then((supabase) => listDocuments(supabase, id)),
    admin ? listSalesOptions() : null,
  ])

  const back = (
    <Link
      href="/customers"
      className="mb-2 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] text-sm text-muted transition-colors duration-150 hover:text-ink"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Customers
    </Link>
  )

  if (!result.ok) {
    return (
      <>
        {back}
        <PageHeader title="Customer" />
        <Card>
          <ErrorState
            title="This customer could not be loaded"
            detail={`The server answered: ${result.message}. Nothing was changed. Check your connection and load the page again.`}
            action={
              <Link href={`/customers/${id}`} className={buttonClass("secondary")}>
                Load again
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  const customer = result.customer
  if (!customer) notFound()

  return (
    <>
      {back}
      <CustomerProfile customer={customer} documents={documents} salesOptions={salesOptions} admin={admin} />
    </>
  )
}
