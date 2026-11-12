import Link from "next/link"
import { CalendarClock, ChevronRight, CircleDashed, Hourglass, type LucideIcon } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import { cn } from "@/lib/cn"
import type { Dashboard } from "@/lib/data/dashboard"
import { STALE_DAYS, leadsHref } from "@/lib/leads/filters"
import { plural } from "./format"

type Item = { icon: LucideIcon; tint: string; title: string; detail: string; href: string }

// Each row opens exactly the leads it counts. Icons: a calendar clock for due
// dates, an hourglass for time spent waiting, a dashed circle for "not set".
export function NeedsYouCard({ data, salesId }: { data: Dashboard; salesId: string }) {
  const items: Item[] = []

  if (data.followUpsDue > 0) {
    items.push({
      icon: CalendarClock,
      tint: "bg-negative-soft text-negative",
      title: plural(data.followUpsDue, "follow-up is due", "follow-ups are due"),
      detail: "The follow-up date is today or earlier and the lead is still open.",
      href: leadsHref({ view: "followup", sales: salesId, sort: "followup" }),
    })
  }
  if (data.stale > 0) {
    items.push({
      icon: Hourglass,
      tint: "bg-warning-soft text-warning",
      title: `${plural(data.stale, "lead", "leads")} stuck for more than ${STALE_DAYS} days`,
      detail: "Open leads whose status has not changed in that time, longest first.",
      href: leadsHref({ view: "stale", sales: salesId, sort: "longest" }),
    })
  }
  if (data.noStatus > 0) {
    items.push({
      icon: CircleDashed,
      tint: "bg-surface-sunken text-ink",
      title: plural(data.noStatus, "lead has no status", "leads have no status"),
      detail: "They are not counted in the pipeline until someone sets one.",
      href: leadsHref({ status: "none", sales: salesId }),
    })
  }

  return (
    <Card>
      <CardHeader title="Needs you" />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing is waiting on you"
          detail={`No follow-up is due, no open lead has sat in one status for more than ${STALE_DAYS} days, and every lead has a status.`}
        />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-2 py-2.5 transition-colors duration-150 hover:bg-surface-sunken"
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", item.tint)}>
                  <item.icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-[13px] text-muted">{item.detail}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
