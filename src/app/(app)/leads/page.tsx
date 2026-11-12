import Link from "next/link"
import { Suspense } from "react"
import { Plus } from "lucide-react"
import { LeadFilterBar } from "@/components/leads/lead-filters"
import { LeadsFeedback } from "@/components/leads/feedback"
import { LeadList } from "@/components/leads/lead-list"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { listSalesUsers } from "@/lib/data/leads"
import { leadsHref, parseLeadFilters } from "@/lib/leads/filters"

export const metadata = { title: "Leads" }

const NOTICES: Record<string, string> = {
  created: "The lead was added.",
  updated: "Your changes to the lead were saved.",
  unchanged: "Nothing was changed, so the lead was not saved.",
}

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const raw = await searchParams
  const profile = await getProfile()
  const admin = isAdmin(profile)
  const filters = parseLeadFilters(raw)
  // RLS already limits everyone else to their own leads, so the salesperson filter is Admin-only.
  if (!admin) filters.sales = ""
  const salesUsers = admin ? await listSalesUsers() : null

  const notice = typeof raw.notice === "string" ? NOTICES[raw.notice] : undefined
  const here = leadsHref(filters)

  return (
    <>
      <PageHeader
        title="Leads"
        actions={
          <Link href={`/leads/new?back=${encodeURIComponent(here)}`} className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            Add lead
          </Link>
        }
      />
      <Card className="max-md:p-4">
        <LeadFilterBar key={here} filters={filters} salesUsers={salesUsers} />
        <LeadsFeedback key={notice ?? "none"} initial={notice ? { ok: true, message: notice } : null}>
          <Suspense key={here} fallback={<LoadingState label="Loading leads…" />}>
            <LeadList filters={filters} salesUsers={salesUsers} />
          </Suspense>
        </LeadsFeedback>
      </Card>
    </>
  )
}
