"use client"

import { useState } from "react"
import { leadName } from "@/components/leads/format"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import type { CalendarItem } from "@/lib/data/calendar"
import { DayBookLink } from "./calendar-booking"
import { MonthCalendar } from "./month-calendar"
import { byDay, dayHeading, dayLabel, monthLabel, monthOf, stateOf, type Month } from "./model"
import { ScheduleItem } from "./schedule-item"

const linkClass =
  "inline-flex min-h-11 items-center rounded-[var(--radius-control)] text-[13px] font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-[120ms] hover:decoration-ink md:min-h-8"

/**
 * The calendar page's list: the compact month beside (or, on a phone, above)
 * the month's items grouped by day. Picking a day narrows the list to it.
 */
export function Agenda({
  items,
  month,
  today,
  now,
  admin,
  owners,
  initialDay,
}: {
  items: CalendarItem[]
  month: Month
  today: string
  now: string
  admin: boolean
  owners: Record<string, string> | null
  initialDay: string
}) {
  const [selected, setSelected] = useState<string | null>(initialDay || null)
  // Grouped by the office (Bali) day, as the month beside it.
  const inMonth = items.filter((item) => monthOf(item.officeDay) === month || item.officeDay === selected)
  const shown = selected ? inMonth.filter((item) => item.officeDay === selected) : inMonth

  return (
    <Card className="@container max-md:p-4">
      <div className="grid gap-5 @3xl:grid-cols-[272px_minmax(0,1fr)]">
        <MonthCalendar
          month={month}
          today={today}
          now={now}
          items={items}
          selected={selected}
          onSelect={(day) => setSelected(day === selected ? null : day)}
        />
        <div className="min-w-0" aria-live="polite">
          {selected ? (
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3">
              <h2 className="shrink-0 text-[17px] font-medium">{dayLabel(selected, today)}</h2>
              <div className="flex flex-wrap items-center gap-x-4">
                <DayBookLink day={selected} className={linkClass} />
                <button type="button" onClick={() => setSelected(null)} className={linkClass}>
                  Show the whole month
                </button>
              </div>
            </div>
          ) : (
            <h2 className="mb-1 text-[17px] font-medium">{monthLabel(month)}</h2>
          )}
          <AgendaList days={byDay(shown)} today={today} now={now} admin={admin} owners={owners} month={month} selected={selected} />
        </div>
      </div>
    </Card>
  )
}

function AgendaList({
  days,
  today,
  now,
  admin,
  owners,
  month,
  selected,
}: {
  days: Array<{ day: string; items: CalendarItem[] }>
  today: string
  now: string
  admin: boolean
  owners: Record<string, string> | null
  month: Month
  selected: string | null
}) {
  if (days.length === 0) {
    return (
      <EmptyState
        title={selected ? "Nothing on this day" : `Nothing booked in ${monthLabel(month)}`}
        detail="Book an appointment, site survey, call or follow-up with New schedule, or from a customer's page, and it shows here."
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {days.map(({ day, items }) => (
        <section key={day} id={`day-${day}`} aria-label={dayHeading(day, today)}>
          <h3 className="mt-2 text-xs font-medium text-muted">{dayHeading(day, today)}</h3>
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <ScheduleItem
                key={item.id}
                item={item}
                state={stateOf(item, now)}
                today={today}
                admin={admin}
                owner={item.salesId ? (owners?.[item.salesId] ?? null) : null}
                customer={{ id: item.leadId, name: leadName(item.customerName) }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
