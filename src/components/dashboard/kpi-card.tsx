import Link from "next/link"
import { Card, CardHeader } from "@/components/ui/card"
import { DeltaPill } from "@/components/ui/delta-pill"
import type { Dashboard, Period } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { n, percent, plural } from "./format"

// The page's focal point: deals won in the chosen period against the period before it.
export function KpiCard({ data, period, salesId }: { data: Dashboard; period: Period; salesId: string }) {
  const { now, previous } = data.deals
  const scale = Math.max(now, previous, 1)
  const closed = now + data.noDeals.now
  const inPeriod = { sales: salesId, sfrom: period.from, sto: period.to }
  const before = `the ${period.days} days before`

  const rows = [
    {
      label: "Leads added",
      value: n(data.added.now),
      detail: `${n(data.added.previous)} in ${before}`,
      href: leadsHref({ sales: salesId, from: period.from, to: period.to, sort: "newest" }),
    },
    {
      label: "Marked no deal",
      value: n(data.noDeals.now),
      detail: null,
      href: leadsHref({ ...inPeriod, status: "No Deal" }),
    },
  ]

  return (
    <Card>
      <CardHeader title="Deals won" meta={`${period.label}, ${period.rangeLabel}`} />

      <p className="text-[64px] font-light leading-none tracking-tight tabular-nums md:text-[72px]">{n(now)}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <DeltaPill value={now - previous} />
        <span>
          against {n(previous)} in {before}
        </span>
      </p>
      <p className="mt-3 text-sm text-muted">
        {closed > 0
          ? `${percent(now, closed)} of the ${plural(closed, "lead", "leads")} closed in this period ended in a deal.`
          : "No lead was closed as Deal or No deal in this period."}
      </p>

      <dl className="mt-5 flex flex-col gap-2 text-[13px]">
        <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3">
          <dt className="text-ink">This period</dt>
          <dd className="h-3 rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(now / scale) * 100}%` }} />
          </dd>
          <dd className="w-8 text-right tabular-nums">{n(now)}</dd>
        </div>
        <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3">
          <dt className="text-muted">Period before</dt>
          <dd className="h-3 rounded-full bg-surface-sunken">
            <div className="hatch h-full rounded-full text-accent" style={{ width: `${(previous / scale) * 100}%` }} />
          </dd>
          <dd className="w-8 text-right tabular-nums text-muted">{n(previous)}</dd>
        </div>
      </dl>

      <ul className="mt-5 divide-y divide-line border-t border-line">
        {now > 0 ? (
          <li>
            <Link
              href={leadsHref({ ...inPeriod, status: "Deal" })}
              className="flex min-h-11 items-center justify-between gap-3 text-sm hover:underline"
            >
              <span>{now === 1 ? "Open this deal" : `Open these ${n(now)} deals`}</span>
            </Link>
          </li>
        ) : null}
        {rows.map((row) => (
          <li key={row.label}>
            <Link href={row.href} className="group flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm">
              <span className="group-hover:underline">{row.label}</span>
              <span className="text-right">
                <span className="tabular-nums">{row.value}</span>
                {row.detail ? <span className="block text-xs text-muted">{row.detail}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
