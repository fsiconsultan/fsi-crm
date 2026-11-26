import Link from "next/link"
import { leadName } from "@/components/leads/format"
import { Card } from "@/components/ui/card"
import type { CalendarItem } from "@/lib/data/calendar"
import { SCHEDULE_KIND_LABEL } from "@/lib/schedules/types"
import { DayBookButton } from "./calendar-booking"
import { calendarHref, type CalendarParams } from "./calendar-params"
import { AiTags, KindDot } from "./kind"
import { aiBooking, dayLabelLong, gridRange, isOverdue, monthGrid, officeTimeLabel, onDay, type DayCell } from "./model"

/** Items listed in a day cell before "+N more". */
const SHOWN = 3

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type CellKey = "today" | "inMonth" | "outside"
const NUMBER_TONE: Record<CellKey, string> = {
  today: "bg-ink text-ink-contrast",
  inMonth: "text-ink",
  outside: "text-muted",
}
const CELL_TONE: Record<"inMonth" | "outside", string> = { inMonth: "bg-surface", outside: "bg-canvas/60" }

type LineTone = "scheduled" | "overdue" | "done"
const LINE_TONE: Record<LineTone, string> = {
  scheduled: "text-ink",
  overdue: "text-negative",
  done: "text-muted line-through",
}

function lineTone(item: CalendarItem, now: string): LineTone {
  if (item.status === "done") return "done"
  return isOverdue(item, now) ? "overdue" : "scheduled"
}

/** "10:00 WIB": the customer's start time with its zone. The Bali time is in the tooltip and for screen readers. */
function startLabel(item: CalendarItem) {
  if (item.allDay || !item.startTime) return "All day"
  return `${item.startTime} ${item.zoneLabel}`
}

function cellKey(cell: DayCell): CellKey {
  if (cell.today) return "today"
  return cell.inMonth ? "inMonth" : "outside"
}

/**
 * The desktop month view: seven columns of days, each listing its first three
 * items (time, kind dot, customer) as links to the customer; the rest are one
 * link away in the agenda. Overdue items are pink, done ones struck through.
 * From today on, the empty space of a day (and its "+") books on that day.
 */
export function MonthBoard({
  items,
  params,
  today,
  now,
}: {
  items: CalendarItem[]
  params: CalendarParams
  today: string
  now: string
}) {
  const weeks = monthGrid(params.month, today, items, now)
  const { from, to } = gridRange(params.month)

  return (
    <Card className="p-0">
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-line text-xs text-muted">
        {WEEKDAYS.map((label) => (
          <span key={label} className="px-3 py-2">
            {label}
          </span>
        ))}
      </div>
      <ol aria-label={`Days from ${dayLabelLong(from)} to ${dayLabelLong(to)}`} className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const dayItems = onDay(items, cell.day)
          const more = dayItems.length - SHOWN
          return (
            <li
              key={cell.day}
              aria-label={`${dayLabelLong(cell.day)}${cell.today ? ", today" : ""}, ${dayItems.length === 0 ? "nothing scheduled" : `${dayItems.length} scheduled`}`}
              className={`relative min-h-28 min-w-0 border-b border-r border-line p-1.5 [&:nth-child(7n)]:border-r-0 ${CELL_TONE[cell.inMonth ? "inMonth" : "outside"]}`}
            >
              <DayBookButton day={cell.day} />
              <span
                aria-hidden="true"
                className={`mb-1 ml-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${NUMBER_TONE[cellKey(cell)]}`}
              >
                {Number(cell.day.slice(8))}
              </span>
              {/* Above the day's book button; only the links themselves take the click. */}
              <ul className="pointer-events-none relative flex flex-col gap-0.5">
                {dayItems.slice(0, SHOWN).map((item) => {
                  const tone = lineTone(item, now)
                  const name = leadName(item.customerName)
                  const office = officeTimeLabel(item, today)
                  return (
                    <li key={item.id} className="pointer-events-auto">
                      <Link
                        href={`/customers/${item.leadId}`}
                        title={`${item.title}, ${SCHEDULE_KIND_LABEL[item.kind]}${office ? `, ${office} in Bali` : ""}`}
                        className={`flex min-h-6 min-w-0 items-center gap-1.5 rounded-[6px] px-1 text-xs transition-colors duration-[120ms] hover:bg-surface-sunken ${LINE_TONE[tone]}`}
                      >
                        <KindDot dot={tone === "overdue" ? "overdue" : item.kind} />
                        <span className="shrink-0 tabular-nums text-muted">{startLabel(item)}</span>
                        <span className="truncate">{name}</span>
                        <AiTags booking={aiBooking(item)} size="compact" />
                        <span className="sr-only">
                          , {SCHEDULE_KIND_LABEL[item.kind]}
                          {office ? `, ${office} in Bali` : ""}
                          {tone === "overdue" ? ", overdue" : ""}
                          {tone === "done" ? ", done" : ""}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {more > 0 ? (
                <Link
                  href={calendarHref({ ...params, view: "agenda", day: cell.day })}
                  className="relative mt-0.5 inline-flex min-h-6 items-center rounded-[6px] px-1 text-xs font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                >
                  {more} more
                </Link>
              ) : null}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
