import Link from "next/link"
import { leadName } from "@/components/leads/format"
import { KIND_ICON } from "@/components/schedules/kind"
import { buttonClass } from "@/components/ui/button"
import { Card, CardHeader, CardHeaderLink } from "@/components/ui/card"
import { IconCircle, type Tint } from "@/components/ui/icon-circle"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { getSchedule, type Schedule } from "@/lib/data/schedule"
import { missingRequired } from "@/lib/integrations/env"
import { addDays, formatDay } from "@/lib/leads/dates"
import { leadsHref } from "@/lib/leads/filters"
import { SCHEDULE_KIND_LABEL } from "@/lib/schedules/types"
import { n } from "./format"
import {
  SCHEDULE_DAYS,
  SCHEDULE_LABEL,
  calendarWeeks,
  itemTime,
  type CalendarCell,
  type ScheduleItem,
} from "./schedule"

/** "10:00 WIB (11:00 WITA) · Call" for a booked schedule; the type alone for a date typed on the lead. */
function itemDetail(item: ScheduleItem) {
  const time = itemTime(item)
  if (!time || !item.kind) return [SCHEDULE_LABEL[item.type]]
  return [time, SCHEDULE_KIND_LABEL[item.kind]]
}

const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" })

function dayHeading(day: string, today: string) {
  const date = `${weekday.format(new Date(`${day}T00:00:00Z`))} ${formatDay(day)}`
  if (day === today) return `Today, ${date}`
  return day === addDays(today, 1) ? `Tomorrow, ${date}` : date
}

/** Loads and shows what is scheduled. `owners` (Admin only) adds the salesperson to each row. */
export async function ScheduleCard({
  salesId,
  owners,
  retryHref,
}: {
  salesId: string
  owners: Map<string, string> | null
  retryHref: string
}) {
  let schedule: Schedule | null = null
  try {
    schedule = await getSchedule(salesId)
  } catch (error) {
    console.error(error)
  }

  return (
    <Card className="flex h-full flex-col max-md:p-4">
      <CardHeader
        title="Schedule"
        meta={`Today and the next ${SCHEDULE_DAYS} days`}
        action={<CardHeaderLink href="/calendar">Calendar</CardHeaderLink>}
      />
      {schedule ? (
        <ScheduleBody schedule={schedule} owners={owners} salesId={salesId} />
      ) : (
        <ErrorState
          title="The schedule could not be loaded"
          detail="The database did not answer, so no dates are shown. Check your connection and try again."
          action={
            <a href={retryHref} className={buttonClass("secondary")}>
              Try again
            </a>
          }
        />
      )}
      {/* Only the keys being set is known here; each booked schedule shows its own sync result on the customer's page. */}
      {missingRequired("calendar").length > 0 ? (
        <p className="mt-auto pt-4 text-xs text-muted">Google Calendar is not connected yet.</p>
      ) : null}
    </Card>
  )
}

function ScheduleBody({
  schedule,
  owners,
  salesId,
}: {
  schedule: Schedule
  owners: Map<string, string> | null
  salesId: string
}) {
  const { window, days, overdue } = schedule
  const today = window.from

  if (days.length === 0 && overdue.total === 0) {
    return (
      <EmptyState
        title="Nothing is scheduled"
        detail={`No appointment, site survey, call or follow-up falls in the next ${SCHEDULE_DAYS} days. Book one on a customer's page and it shows here.`}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[224px_minmax(0,1fr)]">
      <MiniCalendar weeks={calendarWeeks(window, days)} />

      <div className="-mr-2 flex max-h-[420px] min-w-0 flex-col gap-4 overflow-y-auto pr-2">
        {overdue.total > 0 ? (
          <section aria-label="Overdue follow-ups">
            <h3 className="mb-1 text-xs font-medium text-negative">
              {overdue.total === 1 ? "1 follow-up overdue" : `${n(overdue.total)} follow-ups overdue`}
            </h3>
            <ul className="divide-y divide-line">
              {overdue.items.map((item) => (
                <ScheduleRow
                  key={`overdue-${item.leadId}`}
                  item={item}
                  tint="pink"
                  detail={[`Was due ${formatDay(item.day, item.day.slice(0, 4) !== today.slice(0, 4))}`, owners?.get(item.salesId ?? "")]}
                />
              ))}
            </ul>
            {overdue.total > overdue.items.length ? (
              <Link
                href={leadsHref({ view: "followup", sales: salesId, sort: "followup" })}
                className="inline-flex min-h-11 items-center text-[13px] font-medium underline decoration-line underline-offset-4 hover:decoration-ink md:min-h-8"
              >
                All follow-ups due
              </Link>
            ) : null}
          </section>
        ) : null}

        {days.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing else is scheduled in the next {SCHEDULE_DAYS} days.</p>
        ) : null}

        {days.map(({ day, items }) => (
          <section key={day} aria-label={dayHeading(day, today)}>
            <h3 className="mb-1 text-xs font-medium text-muted">{dayHeading(day, today)}</h3>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <ScheduleRow
                  key={item.scheduleId ?? `${item.type}-${item.leadId}`}
                  item={item}
                  tint="grey"
                  detail={[...itemDetail(item), owners?.get(item.salesId ?? "")]}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function ScheduleRow({
  item,
  tint,
  detail,
}: {
  item: ScheduleItem
  tint: Tint
  detail: Array<string | undefined>
}) {
  return (
    <li>
      <Link
        href={`/customers/${item.leadId}`}
        className="group -mx-2 flex min-h-[52px] items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors duration-[120ms] hover:bg-surface-sunken focus-visible:-outline-offset-2"
      >
        <IconCircle icon={KIND_ICON[item.kind ?? item.type]} tint={tint} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{leadName(item.name)}</span>
          <span className="block truncate text-xs text-muted">{detail.filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    </li>
  )
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

const cellTone: Record<"today" | "window" | "outside", string> = {
  today: "bg-ink text-ink-contrast",
  window: "text-ink",
  outside: "text-muted",
}

const dotTone: Record<"today" | "window" | "outside", string> = {
  today: "bg-ink-contrast",
  window: "bg-accent",
  outside: "bg-accent",
}

function cellKind(cell: CalendarCell) {
  if (cell.today) return "today"
  return cell.inWindow ? "window" : "outside"
}

// The weeks that hold the next 14 days, Monday first. A dot marks a day with
// something on it; the list beside it says what, so this grid is hidden from
// screen readers instead of repeating it.
function MiniCalendar({ weeks }: { weeks: CalendarCell[][] }) {
  return (
    <div aria-hidden="true" className="grid h-fit grid-cols-7 gap-y-1 text-center text-xs tabular-nums">
      {WEEKDAYS.map((label, index) => (
        <span key={index} className="pb-1 text-[11px] text-muted">
          {label}
        </span>
      ))}
      {weeks.flat().map((cell) => (
        <span key={cell.day} className="flex justify-center">
          <span
            className={`relative flex size-8 items-center justify-center rounded-full ${cellTone[cellKind(cell)]}`}
          >
            {Number(cell.day.slice(8))}
            {cell.count > 0 ? (
              <span className={`absolute bottom-1 size-1 rounded-full ${dotTone[cellKind(cell)]}`} />
            ) : null}
          </span>
        </span>
      ))}
    </div>
  )
}
