import Link from "next/link"
import { Suspense } from "react"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { InsightCard } from "@/components/dashboard/insight-card"
import { buildInsights } from "@/components/dashboard/insights"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { PipelineCard } from "@/components/dashboard/pipeline-card"
import { RecentCard } from "@/components/dashboard/recent-card"
import { TeamCard } from "@/components/dashboard/team-card"
import { WeeklyCard } from "@/components/dashboard/weekly-card"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { PERIODS, getDashboard, resolvePeriod, type Dashboard, type Period } from "@/lib/data/dashboard"
import { listSalesUsers, type SalesUser } from "@/lib/data/leads"

export const metadata = { title: "Overview" }

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const raw = await searchParams
  const profile = await getProfile()
  const admin = isAdmin(profile)

  const period = resolvePeriod(typeof raw.period === "string" ? raw.period : undefined)
  // Admin sees the team and can narrow to one person. Everyone else gets their own leads from RLS.
  const team = admin ? await listSalesUsers().catch(() => null) : null
  const selected = typeof raw.sales === "string" ? team?.find((user) => user.id === raw.sales) : undefined
  const here = `/?period=${period.key}${selected ? `&sales=${selected.id}` : ""}`

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <DashboardFilters
            key={here}
            period={period.key}
            periods={Object.entries(PERIODS).map(([value, label]) => ({ value, label }))}
            sales={selected?.id ?? ""}
            salesOptions={team ? team.map((user) => ({ value: user.id, label: user.name })) : null}
          />
        }
      />
      <Suspense
        key={here}
        fallback={
          <Card>
            <LoadingState label="Counting leads for this period…" />
          </Card>
        }
      >
        <DashboardCards period={period} admin={admin} team={team} selected={selected} retryHref={here} />
      </Suspense>
    </>
  )
}

async function DashboardCards({
  period,
  admin,
  team,
  selected,
  retryHref,
}: {
  period: Period
  admin: boolean
  team: SalesUser[] | null
  selected: SalesUser | undefined
  retryHref: string
}) {
  const salesId = selected?.id ?? ""
  const showTeam = admin && !selected && team !== null

  let data: Dashboard
  try {
    data = await getDashboard({ period, salesId, team: showTeam ? team : null })
  } catch (error) {
    console.error(error)
    return (
      <Card>
        <ErrorState
          title="The Overview could not be loaded"
          detail="The database did not answer one of the counts, so no numbers are shown rather than partial ones. Check your connection and try again. If it keeps failing, tell the admin."
          action={
            // A full reload on purpose: it re-runs every query.
            <a href={retryHref} className={buttonClass("secondary")}>
              Try again
            </a>
          }
        />
      </Card>
    )
  }

  if (data.total === 0) {
    return (
      <Card>
        {selected ? (
          <EmptyState
            title={`${selected.name} has no leads`}
            detail="No lead is assigned to this person, so there is nothing to count. Assign one from the lead's edit form, or switch back to the whole team."
            action={
              <Link href={`/?period=${period.key}`} className={buttonClass("secondary")}>
                Show the whole team
              </Link>
            }
          />
        ) : (
          <EmptyState
            title={admin ? "There are no leads yet" : "No leads are assigned to you yet"}
            detail={
              admin
                ? "Once leads are added, this page shows deals won, the pipeline and what needs attention."
                : "This page counts only the leads assigned to you. Add your first lead, or ask an admin to assign existing ones to you."
            }
            action={
              <Link href="/leads/new" className={buttonClass("primary")}>
                Add a lead
              </Link>
            }
          />
        )}
      </Card>
    )
  }

  const insights = buildInsights(data, salesId)
  const owners = team ? new Map(team.map((user) => [user.id, user.name])) : null

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {admin && team === null ? (
        <div className="md:col-span-2 xl:col-span-3">
          <ErrorState
            title="The sales team list could not be loaded"
            detail="The numbers below are for the whole team, but the salesperson filter and the per-person table are missing. Reload the page to try again."
          />
        </div>
      ) : null}
      <KpiCard data={data} period={period} salesId={salesId} />
      <PipelineCard data={data} salesId={salesId} />
      <div className="md:col-span-2 xl:col-span-1">
        <NeedsYouCard data={data} salesId={salesId} />
      </div>
      <div className={insights.length > 0 ? "md:col-span-2" : "md:col-span-2 xl:col-span-3"}>
        <WeeklyCard weeks={data.weeks} />
      </div>
      {insights.length > 0 ? (
        <div className="md:col-span-2 xl:col-span-1">
          <InsightCard insights={insights} />
        </div>
      ) : null}
      {data.team ? (
        <div className="md:col-span-2">
          <TeamCard team={data.team} period={period} />
        </div>
      ) : null}
      <div className={data.team ? "md:col-span-2 xl:col-span-1" : "md:col-span-2 xl:col-span-3"}>
        <RecentCard leads={data.recent} owners={selected ? null : owners} salesId={salesId} />
      </div>
    </div>
  )
}
