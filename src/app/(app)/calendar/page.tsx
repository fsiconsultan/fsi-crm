import { Suspense } from "react"
import type { SalesChoices } from "@/components/customers/edit-customer"
import { Agenda } from "@/components/schedules/agenda"
import { CalendarBookingProvider, NewScheduleButton } from "@/components/schedules/calendar-booking"
import { CalendarFilters, MonthPager } from "@/components/schedules/calendar-controls"
import { calendarHref, parseCalendarParams, type CalendarParams } from "@/components/schedules/calendar-params"
import { monthLabel, monthOf, shiftMonth } from "@/components/schedules/model"
import { MonthBoard } from "@/components/schedules/month-board"
import { ConnectionNote } from "@/components/schedules/schedule-card"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { getCalendarMonth, schedulesReady, type CalendarMonth } from "@/lib/data/calendar"
import { listSalesUsers, type SalesUser } from "@/lib/data/leads"
import { missingRequired } from "@/lib/integrations/env"
import { today as baliToday } from "@/lib/leads/dates"
import { SCHEDULE_KINDS, SCHEDULE_KIND_LABEL } from "@/lib/schedules/types"

export const metadata = { title: "Calendar" }

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const raw = await searchParams
  const profile = await getProfile()
  const admin = isAdmin(profile)
  const today = baliToday()

  // Admin can narrow to one person. Everyone else sees their own schedules through RLS.
  const [team, ready] = await Promise.all([admin ? listSalesUsers().catch(() => null) : null, schedulesReady()])
  const parsed = parseCalendarParams(raw, today)
  const selected = team?.find((user) => user.id === parsed.sales)
  const params: CalendarParams = { ...parsed, sales: selected?.id ?? "" }
  const here = calendarHref(params)
  // Choosing a filter or a month starts the list on the whole month again.
  const base = { ...params, day: "" }
  const connections = {
    googleConnected: missingRequired("calendar").length === 0,
    emailConnected: missingRequired("email").length === 0,
  }

  return (
    <CalendarBookingProvider env={{ admin, today, ...connections }} sales={bookingSales(admin, team)} enabled={ready} params={params}>
      <PageHeader
        title="Calendar"
        meta="Customer's local time; Bali office time in grey"
        actions={
          <>
            <MonthPager
              label={monthLabel(params.month)}
              prev={{ href: calendarHref({ ...base, month: shiftMonth(params.month, -1) }), label: monthLabel(shiftMonth(params.month, -1)) }}
              next={{ href: calendarHref({ ...base, month: shiftMonth(params.month, 1) }), label: monthLabel(shiftMonth(params.month, 1)) }}
              today={params.month === monthOf(today) ? null : calendarHref({ ...base, month: monthOf(today) })}
            />
            <NewScheduleButton />
          </>
        }
      />
      <CalendarFilters
        views={[
          { label: "Month", href: calendarHref({ ...base, view: "month" }), checked: params.view === "month" },
          { label: "Agenda", href: calendarHref({ ...base, view: "agenda" }), checked: params.view === "agenda" },
        ]}
        sales={
          team
            ? {
                text: selected?.name ?? "Whole team",
                options: [
                  { label: "Whole team", href: calendarHref({ ...base, sales: "" }), checked: !selected },
                  ...team.map((user) => ({
                    label: user.name,
                    href: calendarHref({ ...base, sales: user.id }),
                    checked: user.id === selected?.id,
                  })),
                ],
              }
            : null
        }
        kinds={{
          text: params.kind ? SCHEDULE_KIND_LABEL[params.kind] : "Every type",
          options: [
            { label: "Every type", href: calendarHref({ ...base, kind: "" }), checked: !params.kind },
            ...SCHEDULE_KINDS.map((kind) => ({
              label: SCHEDULE_KIND_LABEL[kind],
              href: calendarHref({ ...base, kind }),
              checked: kind === params.kind,
            })),
          ],
        }}
      />
      {admin && team === null ? (
        <div className="mb-3">
          <ErrorState
            title="The sales team list could not be loaded"
            detail="The calendar shows the whole team, but the salesperson filter and names are missing. Reload to try again."
          />
        </div>
      ) : null}
      <Suspense
        key={here}
        fallback={
          <Card className="max-md:p-4">
            <LoadingState label="Loading the calendar…" />
          </Card>
        }
      >
        <CalendarSection
          params={params}
          admin={admin}
          owners={team ? Object.fromEntries(team.map((user) => [user.id, user.name])) : null}
          today={today}
          retryHref={here}
        />
      </Suspense>
    </CalendarBookingProvider>
  )
}

/** The booking form's salesperson choices: the team for Admin (or "could not load"), nothing for others. */
function bookingSales(admin: boolean, team: SalesUser[] | null): SalesChoices {
  if (!admin) return null
  if (!team) return { ok: false }
  return { ok: true, options: team.map((user) => ({ id: user.id, name: user.name, username: null, status: user.status })) }
}

async function CalendarSection({
  params,
  admin,
  owners,
  today,
  retryHref,
}: {
  params: CalendarParams
  admin: boolean
  owners: Record<string, string> | null
  today: string
  retryHref: string
}) {
  let data: CalendarMonth
  try {
    data = await getCalendarMonth({ month: params.month, salesId: params.sales })
  } catch (error) {
    console.error(error)
    return (
      <Card className="max-md:p-4">
        <ErrorState
          title="The calendar could not be loaded"
          detail="The database did not answer, so no schedules are shown. Check your connection and try again."
          action={
            <a href={retryHref} className={buttonClass("secondary")}>
              Try again
            </a>
          }
        />
      </Card>
    )
  }

  if (!data.setUp) {
    return (
      <Card className="max-md:p-4">
        <EmptyState title="Schedules are not switched on yet." detail="The database update for schedules has not been applied." />
      </Card>
    )
  }

  const now = new Date().toISOString()
  const items = params.kind ? data.items.filter((item) => item.kind === params.kind) : data.items
  const agenda = (
    <Agenda items={items} month={params.month} today={today} now={now} admin={admin} owners={owners} initialDay={params.day} />
  )
  const connections = {
    admin,
    googleConnected: missingRequired("calendar").length === 0,
    emailConnected: missingRequired("email").length === 0,
  }

  return (
    <>
      {params.view === "month" ? (
        <>
          <div className="max-lg:hidden">
            <MonthBoard items={items} params={params} today={today} now={now} />
          </div>
          {/* A phone always gets the list, with the compact month above it. */}
          <div className="lg:hidden">{agenda}</div>
        </>
      ) : (
        agenda
      )}
      <ConnectionNote env={connections} place="page" />
    </>
  )
}
