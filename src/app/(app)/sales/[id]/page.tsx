import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { CalendarClock, CircleDot, Handshake, KanbanSquare, List, UserPlus2 } from "lucide-react"
import { n } from "@/components/dashboard/format"
import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { PipelineCard } from "@/components/dashboard/pipeline-card"
import { RecentCard } from "@/components/dashboard/recent-card"
import { ScheduleCard } from "@/components/dashboard/schedule-card"
import { ChangePhotoButton } from "@/components/sales/photo-dialog"
import { PersonChatsCard, PersonHeader, TeamBackLink } from "@/components/sales/person-view"
import { EditSalesperson, StatusButton } from "@/components/sales/sales-forms"
import { PeriodPill } from "@/components/sales/team-controls"
import { parseTeamParams, personLinks } from "@/components/sales/team-model"
import { StatCard, StatGrid } from "@/components/sales/team-parts"
import { Card } from "@/components/ui/card"
import { pillClass } from "@/components/ui/pill"
import { EmptyState, LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { getDashboard, resolvePeriod } from "@/lib/data/dashboard"
import { getTeamPerson, personChats, waitingChats } from "@/lib/data/team"
import { isUuid, leadsHref } from "@/lib/leads/filters"
import { pipelineHref } from "@/lib/pipeline/filters"

export const metadata = { title: "Salesperson" }

export default async function SalesPersonPage({ params, searchParams }: PageProps<"/sales/[id]">) {
  const profile = await getProfile()
  if (!isAdmin(profile)) redirect("/")

  const { id } = await params
  if (!isUuid(id)) notFound()
  const person = await getTeamPerson(id)
  if (!person) notFound()

  const teamParams = parseTeamParams(await searchParams)
  const period = resolvePeriod(teamParams.period)
  const here = `/sales/${id}${teamParams.period === "30" ? "" : `?period=${teamParams.period}`}`
  const isSelf = person.id === profile.id
  const editable = { id: person.id, name: person.name, username: person.username, role: person.role, status: person.status }

  return (
    <>
      <TeamBackLink />
      <PersonHeader
        person={person}
        isSelf={isSelf}
        actions={
          <>
            <EditSalesperson person={editable} isSelf={isSelf} />
            <ChangePhotoButton person={{ id: person.id, name: person.name, photoUrl: person.photoUrl }} />
            {isSelf ? null : <StatusButton person={editable} />}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PeriodPill params={teamParams} range={period.shortRange} path={`/sales/${id}`} />
        <Link href={leadsHref({ sales: id })} className={pillClass("tinted")}>
          <List aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          Their leads
        </Link>
        <Link href={pipelineHref({ sales: id })} className={pillClass("tinted")}>
          <KanbanSquare aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          Their board
        </Link>
      </div>

      <Suspense
        key={here}
        fallback={
          <Card className="max-md:p-4">
            <LoadingState label={`Counting ${person.name}'s leads…`} />
          </Card>
        }
      >
        <PersonWork id={id} name={person.name} period={period} retryHref={here} />
      </Suspense>
    </>
  )
}

async function PersonWork({
  id,
  name,
  period,
  retryHref,
}: {
  id: string
  name: string
  period: ReturnType<typeof resolvePeriod>
  retryHref: string
}) {
  // A failed count throws to error.tsx (Try again): no partial numbers are shown.
  const [data, chats, waiting] = await Promise.all([
    getDashboard({ period, salesId: id, team: null }),
    personChats(id),
    waitingChats(),
  ])
  const links = personLinks(id, { from: period.from, to: period.to })
  const chatsCard = <PersonChatsCard chats={chats} name={name} retryHref={retryHref} />

  return (
    <div className="flex flex-col gap-3">
      <StatGrid count={4}>
        <StatCard
          icon={CircleDot}
          tint="grey"
          title="Open leads"
          value={n(data.open)}
          meta={`Of ${n(data.total)} assigned`}
          href={links.open}
          linkLabel="Opens these leads"
        />
        <StatCard
          icon={Handshake}
          tint="blue"
          title="Deals"
          value={n(data.deals.now)}
          meta={period.label}
          href={links.deals}
          linkLabel="Opens these deals"
        />
        <StatCard
          icon={UserPlus2}
          tint="grey"
          title="New leads"
          value={n(data.added.now)}
          meta={period.label}
          href={links.added}
          linkLabel="Opens these leads"
        />
        <StatCard
          icon={CalendarClock}
          tint="pink"
          title="Follow-ups due"
          value={n(data.followUpsDue)}
          meta="Today or earlier, lead still open"
          href={links.followUpsDue}
          linkLabel="Opens these leads"
        />
      </StatGrid>

      {data.total === 0 ? (
        <>
          <Card className="max-md:p-4">
            <EmptyState
              title={`${name} has no leads yet`}
              detail="No lead is assigned to them, so there is no pipeline, follow-up or schedule to show. Assign a lead from its edit form in Leads."
              action={
                <Link href="/leads" className={pillClass("tinted")}>
                  Go to leads
                </Link>
              }
            />
          </Card>
          {chatsCard}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            <PipelineCard data={data} salesId={id} />
            <div className="flex min-w-0 flex-col gap-3">
              <NeedsYouCard data={data} salesId={id} waitingChats={waiting ? (waiting.byPerson[id] ?? 0) : null} />
              {chatsCard}
            </div>
          </div>
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[2fr_1fr]">
            <Suspense
              fallback={
                <Card className="max-md:p-4">
                  <LoadingState label="Loading the schedule…" />
                </Card>
              }
            >
              <ScheduleCard salesId={id} owners={null} retryHref={retryHref} />
            </Suspense>
            <RecentCard leads={data.recent} owners={null} salesId={id} />
          </div>
        </>
      )}
    </div>
  )
}
