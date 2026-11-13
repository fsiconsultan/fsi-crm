import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CustomerProfile } from "@/components/customers/customer-profile"
import { BackLink } from "@/components/customers/back-link"
import { todayInBali } from "@/components/customers/format"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import type { LeadScheduleData } from "@/components/schedules/schedule-card"
import { getCustomer, getCustomerChat, parseCustomerId } from "@/lib/data/customers"
import { listDocuments } from "@/lib/data/documents"
import { getLeadSchedules } from "@/lib/data/schedules"
import { missingRequired } from "@/lib/integrations/env"
import { listSalesOptions } from "@/lib/data/sales-users"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Customer" }

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id: rawId } = await params
  const id = parseCustomerId(rawId)
  if (id === null) notFound()

  const profile = await getProfile()
  const admin = isAdmin(profile)

  const [result, documents, salesOptions, chat, schedules] = await Promise.all([
    getCustomer(id),
    createClient().then((supabase) => listDocuments(supabase, id)),
    admin ? listSalesOptions() : null,
    getCustomerChat(id, profile.id),
    loadSchedules(id),
  ])

  if (!result.ok) {
    return (
      <>
        <BackLink />
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
      <BackLink />
      <CustomerProfile
        customer={customer}
        documents={documents}
        chat={chat}
        salesOptions={salesOptions ? (salesOptions.ok ? salesOptions : { ok: false }) : null}
        admin={admin}
        viewerId={profile.id}
        today={todayInBali()}
        schedules={schedules}
        // Only whether the keys are set, never a value. A failed sync still shows on each schedule.
        connections={{ googleConnected: missingRequired("calendar").length === 0, emailConnected: missingRequired("email").length === 0 }}
        now={new Date().toISOString()}
      />
    </>
  )
}

async function loadSchedules(leadId: number): Promise<LeadScheduleData> {
  try {
    const { setUp, upcoming, overdue, past } = await getLeadSchedules(leadId)
    return { ok: true, setUp, items: [...upcoming, ...overdue, ...past] }
  } catch (error) {
    console.error(error)
    return { ok: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}
