import Link from "next/link"
import { Card, CardHeader } from "@/components/ui/card"
import type { Period, TeamRow } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { n } from "./format"

const GRID = "grid grid-cols-[minmax(0,1fr)_48px_72px_40px] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_64px_minmax(0,0.8fr)_72px_48px]"

// Admin only. Rows are sorted by open pipeline, the number an admin acts on.
export function TeamCard({ team, period }: { team: TeamRow[]; period: Period }) {
  const rows = [...team].sort((a, b) => b.open - a.open || b.total - a.total)
  const widest = Math.max(...rows.map((row) => row.open), 1)

  return (
    <Card className="max-md:p-4">
      <CardHeader
        title="By salesperson"
        meta={`In pipeline means not yet Deal or No deal. Deals are for the ${period.label.toLowerCase()}.`}
      />

      <div aria-hidden="true" className={`${GRID} border-b border-line pb-2 text-xs text-muted`}>
        <span>Salesperson</span>
        <span className="text-right">Leads</span>
        <span className="hidden sm:block" />
        <span className="text-right">In pipeline</span>
        <span className="text-right">Deals</span>
      </div>

      <ul className="divide-y divide-line">
        {rows.map(({ user, total, open, deals }) => (
          <li key={user.id}>
            <Link
              href={leadsHref({ sales: user.id })}
              aria-label={`${user.name}: ${n(total)} leads, ${n(open)} in pipeline, ${n(deals)} deals in the ${period.label.toLowerCase()}`}
              className={`${GRID} group min-h-11 py-2 text-sm`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium group-hover:underline">{user.name}</span>
                <span className="block truncate text-xs text-muted">
                  {[user.role, user.status === "Inactive" ? "inactive" : null].filter(Boolean).join(", ")}
                </span>
              </span>
              <span className="text-right tabular-nums">{n(total)}</span>
              <span className="hidden h-2.5 rounded-full bg-surface-sunken sm:block">
                <span
                  className="hatch block h-full rounded-full text-accent"
                  style={{ width: `${(open / widest) * 100}%`, minWidth: open > 0 ? 4 : 0 }}
                />
              </span>
              <span className="text-right tabular-nums">{n(open)}</span>
              <span className="text-right tabular-nums">{n(deals)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
