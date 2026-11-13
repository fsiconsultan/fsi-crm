import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { CalendarClock, CircleDot, Handshake, MessageCircle } from "lucide-react"
import { n } from "@/components/dashboard/format"
import { AddSalesperson } from "@/components/sales/sales-forms"
import { PeriodPill, TeamListControls } from "@/components/sales/team-controls"
import { TeamList } from "@/components/sales/team-list"
import { filterTeam, isInactive, loadScale, parseTeamParams, sortTeam, teamHref } from "@/components/sales/team-model"
import { StatCard, StatGrid } from "@/components/sales/team-parts"
import { PageHeader } from "@/components/shell/page-header"
import { Card, CardHeader } from "@/components/ui/card"
import { pillClass } from "@/components/ui/pill"
import { EmptyState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { resolvePeriod } from "@/lib/data/dashboard"
import { loadTeam } from "@/lib/data/team"
import { leadsHref } from "@/lib/leads/filters"

export const metadata = { title: "Sales team" }

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const profile = await getProfile()
  if (!isAdmin(profile)) redirect("/")

  const params = parseTeamParams(await searchParams)
  // The Overview's own period rules, so "Deals" here and there cover the same days.
  const period = resolvePeriod(params.period)
  const range = { from: period.from, to: period.to }
  // A failed read throws to error.tsx, which offers Try again; no partial numbers are shown.
  const { rows, summary } = await loadTeam(period)

  const active = rows.filter((row) => !isInactive(row.person)).length
  const showChats = summary.waitingChats !== null
  const shown = sortTeam(filterTeam(rows, params.role), params.sort)
  const activeRows = shown.filter((row) => !isInactive(row.person))
  const inactiveRows = shown.filter((row) => isInactive(row.person))
  const onlyYou = rows.every((row) => row.person.id === profile.id)
  const listProps = {
    scale: loadScale(rows),
    range,
    periodLabel: period.label,
    currentUserId: profile.id,
    showChats,
  }

  return (
    <>
      <PageHeader
        title="Sales team"
        meta={`${rows.length === 1 ? "1 person" : `${n(rows.length)} people`}, ${n(active)} active`}
        actions={
          <>
            <PeriodPill params={params} range={period.shortRange} />
            <AddSalesperson />
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <StatGrid count={showChats ? 4 : 3}>
          <StatCard
            icon={CircleDot}
            tint="grey"
            title="Open leads"
            value={n(summary.open)}
            meta="Has a status, not yet decided"
            href={leadsHref({ view: "open" })}
            linkLabel="Opens these leads"
          />
          <StatCard
            icon={Handshake}
            tint="blue"
            title="Deals"
            value={n(summary.deals)}
            meta={period.label}
            href={leadsHref({ status: "Deal", sfrom: range.from, sto: range.to })}
            linkLabel="Opens these deals"
          />
          <StatCard
            icon={CalendarClock}
            tint="pink"
            title="Follow-ups due"
            value={n(summary.followUpsDue)}
            meta="Today or earlier, lead still open"
            href={leadsHref({ view: "followup", sort: "followup" })}
            linkLabel="Opens these leads"
          />
          {summary.waitingChats !== null ? (
            <StatCard
              icon={MessageCircle}
              tint="amber"
              title="Chats waiting"
              value={n(summary.waitingChats)}
              meta="For a person, in WhatsApp"
              href="/inbox"
              linkLabel="Opens the inbox"
            />
          ) : null}
        </StatGrid>

        <Card className="max-xl:border-0 max-xl:bg-transparent max-xl:p-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 [&>header]:mb-0">
            <CardHeader title="People" meta={`Deals and new leads: ${period.label.toLowerCase()}. Bars: leads assigned, against the largest load; blue is still open.`} />
            <TeamListControls params={params} />
          </div>
          <TeamBody
            onlyYou={onlyYou}
            nothingShown={shown.length === 0}
            role={params.role}
            clearHref={teamHref({ ...params, role: "" })}
          >
            {activeRows.length > 0 ? <TeamList rows={activeRows} {...listProps} /> : null}
            {inactiveRows.length > 0 ? (
              <TeamList
                rows={inactiveRows}
                {...listProps}
                heading={
                  <h3 className="mb-3 mt-6 text-[13px] font-medium text-muted xl:mb-1">
                    Inactive, cannot sign in ({n(inactiveRows.length)})
                  </h3>
                }
              />
            ) : null}
          </TeamBody>
        </Card>
      </div>
    </>
  )
}

function TeamBody({
  onlyYou,
  nothingShown,
  role,
  clearHref,
  children,
}: {
  onlyYou: boolean
  nothingShown: boolean
  role: string
  clearHref: string
  children: ReactNode
}) {
  if (onlyYou) {
    return (
      <EmptyState
        title="Only you are on the team so far"
        detail="Add a salesperson to create their login. They then see only the leads assigned to them, and their numbers show up here."
      />
    )
  }
  if (nothingShown) {
    return (
      <EmptyState
        title={`Nobody has the ${role} role`}
        detail="Choose another role, or show everyone."
        action={
          <Link href={clearHref} className={pillClass("tinted")}>
            Show all roles
          </Link>
        }
      />
    )
  }
  return <>{children}</>
}
