"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarPlus } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { buttonClass } from "@/components/ui/button"
import { pillClass } from "@/components/ui/pill"
import type { ScheduleView } from "@/lib/schedules/types"
import { MonthCalendar } from "./month-calendar"
import { TIMES_NOTE, dayLabel, groupSchedules, monthOf, onDay, stateOf } from "./model"
import { ScheduleItem } from "./schedule-item"
import { useSchedules, type ScheduleEnv } from "./schedule-provider"

export type LeadScheduleData =
  | { ok: true; setUp: boolean; items: ScheduleView[] }
  | { ok: false; message: string }

const linkClass =
  "inline-flex min-h-11 items-center rounded-[var(--radius-control)] text-[13px] font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-[120ms] hover:decoration-ink md:min-h-8"

/** The customer profile's Schedule card: a month with dots, then what is coming up, overdue and past. */
export function ScheduleCard({
  data,
  now,
  owners,
  retryHref,
}: {
  data: LeadScheduleData
  /** UTC ISO, from the server render, so overdue means the same on server and browser. */
  now: string
  /** Salesperson names by id (Admin only). */
  owners: Record<string, string> | null
  retryHref: string
}) {
  const schedules = useSchedules()
  const env = schedules?.env

  if (!data.ok || !env) {
    return (
      <Card as="section" className="max-md:p-4">
        <CardHeader title="Schedule" />
        <ErrorState
          title="The schedule could not be loaded"
          detail={`The server answered: ${data.ok ? "unknown error" : data.message}. Nothing was changed. Load the page again to retry.`}
          action={
            <Link href={retryHref} className={buttonClass("secondary")}>
              Load again
            </Link>
          }
        />
      </Card>
    )
  }

  if (!data.setUp) {
    return (
      <Card as="section" className="max-md:p-4">
        <CardHeader title="Schedule" />
        <EmptyState
          title="Schedules are not switched on yet."
          detail="The database update for schedules has not been applied."
        />
      </Card>
    )
  }

  return <ScheduleBody items={data.items} now={now} env={env} owners={owners} />
}

function ScheduleBody({
  items,
  now,
  env,
  owners,
}: {
  items: ScheduleView[]
  now: string
  env: ScheduleEnv
  owners: Record<string, string> | null
}) {
  const schedules = useSchedules()
  const [month, setMonth] = useState(monthOf(env.today))
  const [selected, setSelected] = useState<string | null>(null)
  const groups = groupSchedules(items, now)
  const meta = [
    `${groups.upcoming.length} upcoming`,
    groups.overdue.length > 0 ? `${groups.overdue.length} overdue` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Card as="section" className="@container max-md:p-4">
      <div id="schedule" className="scroll-mt-4">
        <CardHeader
          title="Schedule"
          meta={items.length === 0 ? "Nothing booked yet" : meta}
          action={
            schedules?.canBook ? (
              <button type="button" onClick={() => schedules.open({ kind: "book" })} className={pillClass("tinted")}>
                <CalendarPlus aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                Book
              </button>
            ) : null
          }
        />
      </div>

      <div className="grid gap-5 @2xl:grid-cols-[272px_minmax(0,1fr)]">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          today={env.today}
          now={now}
          items={items}
          selected={selected}
          onSelect={(day) => setSelected(day === selected ? null : day)}
        />

        <div className="min-w-0" aria-live="polite">
          {selected ? (
            <DayList
              day={selected}
              items={onDay(items, selected)}
              now={now}
              env={env}
              owners={owners}
              onClear={() => setSelected(null)}
            />
          ) : (
            <GroupedList groups={groups} now={now} env={env} owners={owners} empty={items.length === 0} />
          )}
        </div>
      </div>

      <ConnectionNote env={env} />
    </Card>
  )
}

function ItemList({ items, now, env, owners }: { items: ScheduleView[]; now: string; env: ScheduleEnv; owners: Record<string, string> | null }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <ScheduleItem
          key={item.id}
          item={item}
          state={stateOf(item, now)}
          today={env.today}
          admin={env.admin}
          owner={item.salesId ? (owners?.[item.salesId] ?? null) : null}
        />
      ))}
    </ul>
  )
}

function DayList({
  day,
  items,
  now,
  env,
  owners,
  onClear,
}: {
  day: string
  items: ScheduleView[]
  now: string
  env: ScheduleEnv
  owners: Record<string, string> | null
  onClear: () => void
}) {
  return (
    <section aria-label={`Schedule on ${dayLabel(day, env.today)}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-muted">{dayLabel(day, env.today)}</h3>
        <button type="button" onClick={onClear} className={linkClass}>
          Show everything
        </button>
      </div>
      {items.length > 0 ? (
        <ItemList items={items} now={now} env={env} owners={owners} />
      ) : (
        <p className="py-3 text-[13px] text-muted">Nothing on this day.</p>
      )}
    </section>
  )
}

function GroupedList({
  groups,
  now,
  env,
  owners,
  empty,
}: {
  groups: ReturnType<typeof groupSchedules>
  now: string
  env: ScheduleEnv
  owners: Record<string, string> | null
  empty: boolean
}) {
  const [showPast, setShowPast] = useState(false)

  if (empty) {
    return (
      <EmptyState
        title="Nothing booked with this customer"
        detail="Book an appointment, site survey, call or follow-up. It shows here, on the Overview and in the Calendar."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.overdue.length > 0 ? (
        <section aria-label="Overdue">
          <h3 className="text-xs font-medium text-negative">
            {groups.overdue.length === 1 ? "1 overdue: mark it done or cancel it" : `${groups.overdue.length} overdue: mark them done or cancel them`}
          </h3>
          <ItemList items={groups.overdue} now={now} env={env} owners={owners} />
        </section>
      ) : null}

      <section aria-label="Upcoming">
        <h3 className="text-xs font-medium text-muted">Upcoming</h3>
        {groups.upcoming.length > 0 ? (
          <ItemList items={groups.upcoming} now={now} env={env} owners={owners} />
        ) : (
          <p className="py-3 text-[13px] text-muted">Nothing coming up. Book the next step so nobody forgets it.</p>
        )}
      </section>

      {groups.past.length > 0 ? (
        <section aria-label="Past">
          <button type="button" aria-expanded={showPast} onClick={() => setShowPast(!showPast)} className={linkClass}>
            {showPast ? "Hide past" : `Show past (${groups.past.length})`}
          </button>
          {showPast ? <ItemList items={groups.past} now={now} env={env} owners={owners} /> : null}
        </section>
      ) : null}
    </div>
  )
}

/** The honest line under every schedule view: how times are written, and what is not connected yet. */
const NOTE_PLACE = {
  card: "mt-4 border-t border-line pt-3",
  page: "mt-3 px-1",
} as const

export function ConnectionNote({
  env,
  place = "card",
}: {
  env: Pick<ScheduleEnv, "admin" | "googleConnected" | "emailConnected">
  place?: keyof typeof NOTE_PLACE
}) {
  const missing = [
    env.googleConnected ? null : "Google Calendar is not connected yet.",
    env.emailConnected ? null : "Email to leads is not set up yet.",
  ].filter(Boolean)
  return (
    <p className={`text-xs text-muted ${NOTE_PLACE[place]}`}>
      {TIMES_NOTE} {missing.join(" ")}
      {missing.length > 0 && env.admin ? (
        <>
          {" "}
          <Link href="/settings" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            Open Settings
          </Link>
        </>
      ) : null}
    </p>
  )
}
