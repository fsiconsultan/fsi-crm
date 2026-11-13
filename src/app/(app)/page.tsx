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
import { countWaitingChats } from "@/lib/whatsapp/inbox"

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
  const salesQuery = selected ? `&sales=${selected.id}` : ""

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <DashboardFilters
            range={period.shortRange}
            // Deals are compared by status date, which is real data for every period.
            compare={period.prevShortRange}
            periods={Object.entries(PERIODS).map(([key, label]) => ({
              label,
              href: `/?period=${key}${salesQuery}`,
              checked: key === period.key,
            }))}
            scope={
              team
                ? {
                    label: selected?.name ?? "Whole team",
                    options: [
                      { label: "Whole team", href: `/?period=${period.key}`, checked: !selected },
                      ...team.map((user) => ({
                        label: user.name,
                        href: `/?period=${period.key}&sales=${user.id}`,
                        checked: user.id === selected?.id,
                      })),
                    ],
                  }
                : null
            }
            exportInput={{ period: period.key, sales: selected?.id ?? "" }}
          />
        }
      />
      <Suspense
        key={here}
        fallback={
          <Card className="max-md:p-4">
            <LoadingState label="Counting leads for this period…" />
          </Card>
        }
      >
        <DashboardCards
          period={period}
          admin={admin}
          team={team}
          selected={selected}
          retryHref={here}
          viewerId={profile.id}
        />
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
  viewerId,
}: {
  period: Period
  admin: boolean
  team: SalesUser[] | null
  selected: SalesUser | undefined
  retryHref: string
  viewerId: string
}) {
  const salesId = selected?.id ?? ""
  const showTeam = admin && !selected && team !== null

  let data: Dashboard
  try {
    data = await getDashboard({ period, salesId, team: showTeam ? team : null })
  } catch (error) {
    console.error(error)
    return (
      <Card className="max-md:p-4">
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
      <Card className="max-md:p-4">
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
  const waitingChats = await countWaitingChats(viewerId)

  return (
    <>
      {admin && team === null ? (
        <div className="mb-3">
          <ErrorState
            title="The sales team list could not be loaded"
            detail="The numbers are for the whole team, but the salesperson menu and the per-person table are missing. Reload to try again."
          />
        </div>
      ) : null}

      {/* DESIGN.md "Desktop layout": cards size to their content, never to the window height,
          so a tall screen does not stretch them. Three columns at 1280px and wider (KPI and weekly | the tall
          waterfall | insight and Needs you), two columns from 768px. Source order follows the
          desktop columns so Tab moves the way the eye does; a phone restacks with `order`
          into KPI, Needs you, insight, weekly, waterfall. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:[grid-template-areas:'kpi_break'_'weekly_break'_'insight_needs'] xl:grid-cols-3 xl:[grid-template-areas:'kpi_break_insight'_'weekly_break_needs']">
        <div className="order-1 min-w-0 md:order-none md:[grid-area:kpi]">
          <KpiCard data={data} period={period} salesId={salesId} />
        </div>
        <div className="order-4 min-w-0 md:order-none md:[grid-area:weekly]">
          <WeeklyCard weeks={data.weeks} afterImport={data.weeksAfterImport} />
        </div>
        <div className="order-5 min-w-0 md:order-none md:[grid-area:break]">
          <PipelineCard data={data} salesId={salesId} />
        </div>
        {insights.length > 0 ? (
          <div className="order-3 min-w-0 md:order-none md:[grid-area:insight]">
            <InsightCard insights={insights} />
          </div>
        ) : null}
        <div className={NEEDS_AREA[insights.length > 0 ? "beside" : "alone"]}>
          <NeedsYouCard data={data} salesId={salesId} waitingChats={waitingChats} />
        </div>
      </div>

      <div className={EXTRAS[data.team ? "team" : "solo"]}>
        {data.team ? <TeamCard team={data.team} period={period} /> : null}
        <RecentCard leads={data.recent} owners={selected ? null : owners} salesId={salesId} />
      </div>
    </>
  )
}

// With no insight to show, Needs you takes the insight slot too.
const NEEDS_AREA = {
  beside: "order-2 min-w-0 md:order-none md:[grid-area:needs]",
  alone: "order-2 min-w-0 md:order-none md:[grid-area:insight-start/insight-start/needs-end/needs-end]",
} as const

// Below the grid, after a 24px gap (DESIGN.md): Admin's table beside the recent leads.
const EXTRAS = {
  team: "mt-6 grid grid-cols-1 items-start gap-3 xl:grid-cols-[2fr_1fr]",
  solo: "mt-6 grid grid-cols-1 items-start gap-3",
} as const
