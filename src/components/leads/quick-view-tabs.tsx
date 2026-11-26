import Link from "next/link"
import { pillClass } from "@/components/ui/pill"
import type { LeadFilters } from "@/lib/leads/filters"
import { activeQuickView, quickViewHref, type QuickView } from "@/lib/leads/quick-views"

const number = new Intl.NumberFormat("en-US")

const countTone = { on: "text-ink-contrast/75", off: "text-muted" } as const

/**
 * The quick views as one segmented pill group (the date chip's look): the
 * active one is the ink pill. Each is a link to a URL filter and carries its
 * real count. On a phone the group scrolls sideways inside its own box.
 */
export function QuickViewTabs({
  filters,
  views,
}: {
  filters: LeadFilters
  views: Array<{ view: QuickView; count: number }>
}) {
  const active = activeQuickView(filters)
  return (
    <nav aria-label="Quick views" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="inline-flex items-center gap-1 rounded-full bg-line/70 p-1">
        {views.map(({ view, count }) => {
          const on = view.key === active?.key
          return (
            <li key={view.key}>
              <Link
                href={quickViewHref(view, filters)}
                aria-current={on ? "page" : undefined}
                className={pillClass(on ? "on" : "ghost", "px-3.5 md:h-8")}
              >
                {view.label}{" "}
                <span className={`tabular-nums ${countTone[on ? "on" : "off"]}`}>{number.format(count)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
