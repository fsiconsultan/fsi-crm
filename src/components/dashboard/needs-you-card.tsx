import Link from "next/link"
import { CalendarClock, CalendarX, ChevronRight, CircleDashed, Hourglass, MessageCircle, type LucideIcon } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import type { Dashboard } from "@/lib/data/dashboard"
import { STALE_DAYS, leadsHref } from "@/lib/leads/filters"
import { plural } from "./format"

type Tint = "pink" | "amber" | "blue" | "grey"

// Tinted icon circles as in the reference: pink is overdue, amber is waiting
// too long, blue is a person waiting, grey is missing data.
const tints: Record<Tint, string> = {
  pink: "bg-negative-soft text-negative",
  amber: "bg-warning-soft text-warning",
  blue: "bg-accent-soft text-accent",
  grey: "bg-surface-sunken text-ink",
}

type Item = { icon: LucideIcon; tint: Tint; title: string; detail: string; href: string }

// Each row opens exactly the list it counts. Icons: a calendar clock for due
// dates, an hourglass for time spent waiting, a chat bubble for the inbox, a
// crossed calendar for a missing date, a dashed circle for "not set".
export function NeedsYouCard({
  data,
  salesId,
  waitingChats,
}: {
  data: Dashboard
  salesId: string
  /** Chats waiting for this person; null when the inbox is not available. */
  waitingChats: number | null
}) {
  const items: Item[] = []

  if (data.followUpsDue > 0) {
    items.push({
      icon: CalendarClock,
      tint: "pink",
      title: plural(data.followUpsDue, "follow-up due", "follow-ups due"),
      detail: "Due today or earlier, lead still open",
      href: leadsHref({ view: "followup", sales: salesId, sort: "followup" }),
    })
  }
  if (waitingChats) {
    items.push({
      icon: MessageCircle,
      tint: "blue",
      title: plural(waitingChats, "chat waiting for a person", "chats waiting for a person"),
      detail: "WhatsApp, in the inbox",
      href: "/inbox",
    })
  }
  if (data.stale > 0) {
    items.push({
      icon: Hourglass,
      tint: "amber",
      title: plural(data.stale, "lead stuck", "leads stuck"),
      detail: `Same status for over ${STALE_DAYS} days`,
      href: leadsHref({ view: "stale", sales: salesId, sort: "longest" }),
    })
  }
  if (data.undated > 0) {
    items.push({
      icon: CalendarX,
      tint: "grey",
      title: `${plural(data.undated, "lead", "leads")} with no status date`,
      detail: "Never counted as stuck or in a period",
      href: leadsHref({ view: "undated", sales: salesId }),
    })
  }
  if (data.noStatus > 0) {
    items.push({
      icon: CircleDashed,
      tint: "grey",
      title: plural(data.noStatus, "lead with no status", "leads with no status"),
      detail: "Left out of the pipeline",
      href: leadsHref({ status: "none", sales: salesId }),
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Needs you" meta={items.length === 1 ? "1 thing today" : `${items.length} things today`} />
      <NeedsYouList items={items} />
    </Card>
  )
}

function NeedsYouList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing is waiting on you"
        detail={`No follow-up is due, no chat waits, no open lead has sat still for ${STALE_DAYS} days, and every lead has a status.`}
      />
    )
  }

  return (
    <ul className="-mt-1 flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group -mx-2 flex min-h-[52px] items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors duration-[120ms] hover:bg-surface-sunken"
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tints[item.tint]}`}>
              <item.icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{item.title}</span>
              <span className="block truncate text-xs text-muted">{item.detail}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
