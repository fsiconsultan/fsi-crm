"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, Shapes, Users } from "lucide-react"
import { PillMenu, type FilterOption } from "@/components/dashboard/dashboard-filters"
import { pillClass } from "@/components/ui/pill"

// The calendar page's controls. All are links, so every choice is in the URL
// and Back works: the month pager in the header, then the view toggle
// (desktop only: a phone always gets the list), salesperson (Admin) and kind.

const roundLinkClass =
  "flex size-11 items-center justify-center rounded-full bg-line/70 text-ink transition-colors duration-[120ms] hover:bg-line md:size-10"

export function MonthPager({
  label,
  prev,
  next,
  today,
}: {
  label: string
  prev: { href: string; label: string }
  next: { href: string; label: string }
  /** Link back to this month, when another month is shown. */
  today: string | null
}) {
  return (
    <div className="flex items-center gap-2">
      <Link href={prev.href} className={roundLinkClass}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="sr-only">Previous month, {prev.label}</span>
      </Link>
      <span className="min-w-36 text-center text-sm font-medium tabular-nums">{label}</span>
      <Link href={next.href} className={roundLinkClass}>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span className="sr-only">Next month, {next.label}</span>
      </Link>
      {today ? (
        <Link href={today} className={pillClass("tinted")}>
          This month
        </Link>
      ) : null}
    </div>
  )
}

const segmentTone = { on: "on", off: "ghost" } as const

export function CalendarFilters({
  views,
  sales,
  kinds,
}: {
  views: Array<{ label: string; href: string; checked: boolean }>
  sales: { text: string; options: FilterOption[] } | null
  kinds: { text: string; options: FilterOption[] }
}) {
  return (
    // The menus open toward the left (below-end), so the pills sit at the right.
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2 lg:justify-between">
      <nav aria-label="View" className="max-lg:hidden">
        <ul className="inline-flex items-center gap-1 rounded-full bg-line/70 p-1">
          {views.map((view) => (
            <li key={view.label}>
              <Link
                href={view.href}
                aria-current={view.checked ? "page" : undefined}
                className={pillClass(segmentTone[view.checked ? "on" : "off"], "px-3.5 md:h-8")}
              >
                {view.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {sales ? (
          <PillMenu menuLabel="Salesperson" icon={Users} text={sales.text} hint=", change whose schedule is shown" options={sales.options} />
        ) : null}
        <PillMenu menuLabel="Type" icon={Shapes} text={kinds.text} hint=", change which types are shown" options={kinds.options} />
      </div>
    </div>
  )
}
