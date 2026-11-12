import Link from "next/link"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { DeltaPill } from "@/components/ui/delta-pill"
import { LinkMenu } from "@/components/ui/link-menu"
import { cardMenuButtonClass } from "@/components/ui/pill"
import { EmptyState } from "@/components/ui/states"
import type { Dashboard, Period } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { n, plural } from "./format"

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`
}

type Row = { label: string; value: string; delta: number | null; href: string }

// The page's focal point: the share of decided leads (Deal or No deal) that
// became deals. Decided means the status date falls in the period; when no lead
// was decided in it, the all-time rate is shown and the meta line says so.
export function KpiCard({ data, period, salesId }: { data: Dashboard; period: Period; salesId: string }) {
  const decided = data.deals.now + data.noDeals.now
  const inPeriod = decided > 0
  const dated = { sales: salesId, sfrom: period.from, sto: period.to }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Win rate"
        meta={inPeriod ? `Leads decided ${period.shortRange}` : "All time, none decided in this period"}
        action={
          <LinkMenu
            label="Win rate"
            triggerLabel="Win rate options"
            trigger={<MoreHorizontal aria-hidden="true" className="size-[18px]" />}
            triggerClassName={cardMenuButtonClass}
            items={[
              { label: "Open deals won in this period", href: leadsHref({ ...dated, status: "Deal" }) },
              { label: "Open no deals in this period", href: leadsHref({ ...dated, status: "No Deal" }) },
            ]}
          />
        }
      />
      <KpiBody data={data} period={period} salesId={salesId} inPeriod={inPeriod} />
    </Card>
  )
}

function KpiBody({
  data,
  period,
  salesId,
  inPeriod,
}: {
  data: Dashboard
  period: Period
  salesId: string
  inPeriod: boolean
}) {
  const won = inPeriod ? data.deals.now : data.byStatus["Deal"]
  const total = inPeriod ? data.deals.now + data.noDeals.now : data.byStatus["Deal"] + data.byStatus["No Deal"]

  if (total === 0) {
    return <EmptyState title="No lead is decided yet" detail="The win rate appears once a lead is marked Deal or No deal." />
  }

  const rate = won / total
  const decidedBefore = data.deals.previous + data.noDeals.previous
  // Percentage points against the period before, only when both periods have decided leads.
  const change = inPeriod && decidedBefore > 0 ? Math.round((rate - data.deals.previous / decidedBefore) * 1000) / 10 : null

  const rows: Row[] = [
    {
      label: "Deals won",
      value: n(data.deals.now),
      delta: data.deals.now - data.deals.previous,
      href: leadsHref({ sales: salesId, sfrom: period.from, sto: period.to, status: "Deal" }),
    },
    {
      // A range that reaches back to the one-off import counts the import too.
      label: data.added.includesImport ? "New leads, incl. import" : "New leads",
      value: n(data.added.now),
      delta: null,
      href: leadsHref({ sales: salesId, from: period.from, to: period.to, sort: "newest" }),
    },
    { label: "Open pipeline", value: n(data.open), delta: null, href: leadsHref({ sales: salesId, view: "open" }) },
  ]

  return (
    <>
      <p className="-mt-1 text-[56px] font-normal leading-none tracking-[-0.04em] tabular-nums md:text-[72px]">{pct(rate)}</p>

      <p className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted">
        <DeltaLine change={change} days={period.days} inPeriod={inPeriod} />
      </p>

      <p className="mt-3 text-[13px]">
        {n(won)} of {plural(total, "decided lead", "decided leads")} became {won === 1 ? "a deal" : "deals"}.
      </p>

      <div className="mt-4" role="img" aria-label={`Win rate ${pct(rate)}`}>
        <div className="h-3 rounded-full bg-surface-sunken">
          <div className="hatch h-full rounded-full text-accent" style={{ width: pct(rate), minWidth: rate > 0 ? 6 : 0 }} />
        </div>
        <div aria-hidden="true" className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line xl:mt-auto">
        {rows.map((row) => (
          <li key={row.label}>
            <Link href={row.href} className="group flex min-h-11 items-center justify-between gap-3 py-1">
              <span className="text-[13px] text-muted group-hover:text-ink group-hover:underline">{row.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[15px] font-medium tabular-nums">{row.value}</span>
                {row.delta !== null ? <DeltaPill value={row.delta} /> : null}
                <ChevronRight aria-hidden="true" className="size-4 text-muted" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function DeltaLine({ change, days, inPeriod }: { change: number | null; days: number; inPeriod: boolean }) {
  if (change !== null) {
    return (
      <>
        <DeltaPill value={change} suffix=" pts" />
        <span>vs previous {days} days</span>
      </>
    )
  }
  return <span>{inPeriod ? "No lead was decided in the period before" : "Counts every lead marked Deal or No deal"}</span>
}
