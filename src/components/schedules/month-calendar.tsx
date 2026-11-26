"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { flushSync } from "react-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ScheduleView } from "@/lib/schedules/types"
import { KindDot } from "./kind"
import { dayLabelLong, monthGrid, monthLabel, monthOf, moveDay, shiftMonth, type DayCell, type Month } from "./model"

type CellState = "selected" | "today" | "inMonth" | "outside"

const CELL_TONE: Record<CellState, string> = {
  selected: "bg-ink text-ink-contrast",
  today: "font-medium text-ink ring-1 ring-inset ring-ink hover:bg-surface-sunken",
  inMonth: "text-ink hover:bg-surface-sunken",
  outside: "text-muted hover:bg-surface-sunken",
}

function cellState(cell: DayCell, selected: string | null): CellState {
  if (cell.day === selected) return "selected"
  if (cell.today) return "today"
  return cell.inMonth ? "inMonth" : "outside"
}

function cellLabel(cell: DayCell) {
  const parts = [dayLabelLong(cell.day)]
  if (cell.today) parts.push("today")
  parts.push(cell.count === 0 ? "nothing scheduled" : `${cell.count} scheduled`)
  if (cell.dots.includes("overdue")) parts.push("something overdue")
  return parts.join(", ")
}

const WEEKDAYS = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
  ["S", "Sunday"],
] as const

const navButtonClass =
  "flex size-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink transition-colors duration-[120ms] hover:bg-surface-sunken md:size-9"

/**
 * A compact month in the reference style: Monday first, today outlined, a dot
 * per kind on days with something on them (pink when overdue). Each day is a
 * button that picks the day; arrow keys move by day and week, Home and End to
 * the week's ends, and only one day is in the Tab order. Without
 * `onMonthChange` the month is fixed (the page around it moves months) and the
 * arrows stop at the edge of the grid.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  today,
  now,
  items,
  selected,
  onSelect,
}: {
  month: Month
  onMonthChange?: (month: Month) => void
  today: string
  now: string
  items: ScheduleView[]
  selected: string | null
  onSelect: (day: string) => void
}) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const weeks = monthGrid(month, today, items, now)
  const cells = weeks.flat()
  const inGrid = (day: string | null) => day !== null && cells.some((cell) => cell.day === day)
  // The one day reachable with Tab.
  const tabStop = [focusDay, selected, today].find((day) => inGrid(day) && monthOf(day ?? "") === month) ?? `${month}-01`

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const next = moveDay(day, event.key)
    if (!next) return
    event.preventDefault()
    if (!inGrid(next) && !onMonthChange) return
    flushSync(() => {
      if (!inGrid(next)) onMonthChange?.(monthOf(next))
      setFocusDay(next)
    })
    tableRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus()
  }

  const pick = (day: string) => {
    setFocusDay(day)
    if (monthOf(day) !== month) onMonthChange?.(monthOf(day))
    onSelect(day)
  }

  return (
    <div className="min-w-0">
      {onMonthChange ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-medium">
            {monthLabel(month)}
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} className={navButtonClass}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span className="sr-only">Previous month, {monthLabel(shiftMonth(month, -1))}</span>
            </button>
            <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} className={navButtonClass}>
              <ChevronRight aria-hidden="true" className="size-4" />
              <span className="sr-only">Next month, {monthLabel(shiftMonth(month, 1))}</span>
            </button>
          </div>
        </div>
      ) : null}
      <table ref={tableRef} className="w-full table-fixed border-collapse text-center text-xs tabular-nums">
        <caption className="sr-only">
          {monthLabel(month)}. Arrow keys move between days, Enter shows a day.
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long], index) => (
              <th key={index} scope="col" abbr={long} className="pb-1 text-[11px] font-normal text-muted">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].day}>
              {week.map((cell) => (
                <td key={cell.day} className="p-px">
                  <button
                    type="button"
                    data-day={cell.day}
                    tabIndex={cell.day === tabStop ? 0 : -1}
                    aria-pressed={cell.day === selected}
                    aria-label={cellLabel(cell)}
                    onClick={() => pick(cell.day)}
                    onKeyDown={(event) => onKeyDown(event, cell.day)}
                    className={`flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] transition-colors duration-[120ms] md:h-10 ${CELL_TONE[cellState(cell, selected)]}`}
                  >
                    <span>{Number(cell.day.slice(8))}</span>
                    <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                      {cell.dots.slice(0, 4).map((dot) => (
                        <KindDot key={dot} dot={dot} />
                      ))}
                    </span>
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
