import Link from "next/link"
import { Suspense } from "react"
import { KanbanSquare, Plus } from "lucide-react"
import { LeadFilterBar } from "@/components/leads/lead-filters"
import { LeadsFeedback } from "@/components/leads/feedback"
import { LeadList } from "@/components/leads/lead-list"
import { QuickViewTabs } from "@/components/leads/quick-view-tabs"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { pillClass } from "@/components/ui/pill"
import { LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { countLeads, listSalesUsers } from "@/lib/data/leads"
import { today } from "@/lib/leads/dates"
import { leadsHref, parseLeadFilters } from "@/lib/leads/filters"
import { QUICK_VIEWS, quickViewWhere } from "@/lib/leads/quick-views"

export const metadata = { title: "Leads" }

const NOTICES: Record<string, string> = {
  created: "The lead was added.",
  updated: "Your changes to the lead were saved.",
  unchanged: "Nothing was changed, so the lead was not saved.",
}

const number = new Intl.NumberFormat("en-US")

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const raw = await searchParams
  const profile = await getProfile()
  const admin = isAdmin(profile)
  const filters = parseLeadFilters(raw)
  // RLS already limits everyone else to their own leads, so the salesperson filter is Admin-only.
  if (!admin) filters.sales = ""

  // Every number is a count query run as the signed-in user, built by the same
  // query builder as the list and the Overview's Needs you rows.
  const [salesUsers, total, counts] = await Promise.all([
    admin ? listSalesUsers() : null,
    countLeads({}),
    Promise.all(QUICK_VIEWS.map((view) => countLeads(quickViewWhere(view, filters)))),
  ])

  const notice = typeof raw.notice === "string" ? NOTICES[raw.notice] : undefined
  const here = leadsHref(filters)

  return (
    <>
      <PageHeader
        title="Leads"
        meta={total === 1 ? "1 lead" : `${number.format(total)} leads`}
        actions={
          <>
            <Link href="/pipeline" className={pillClass("tinted")}>
              <KanbanSquare aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              Board view
            </Link>
            <Link href={`/leads/new?back=${encodeURIComponent(here)}`} className={pillClass("on")}>
              <Plus aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              Add lead
            </Link>
          </>
        }
      />
      <div className="mb-3 flex flex-col gap-3">
        <QuickViewTabs filters={filters} views={QUICK_VIEWS.map((view, index) => ({ view, count: counts[index] }))} />
        <LeadFilterBar filters={filters} salesUsers={salesUsers} today={today()} />
      </div>
      <Card className="max-md:border-0 max-md:bg-transparent max-md:p-0 xl:px-3 xl:pt-3">
        <LeadsFeedback key={notice ?? "none"} initial={notice ? { ok: true, message: notice } : null}>
          <Suspense key={here} fallback={<LoadingState label="Loading leads…" />}>
            <LeadList filters={filters} salesUsers={salesUsers} />
          </Suspense>
        </LeadsFeedback>
      </Card>
    </>
  )
}
