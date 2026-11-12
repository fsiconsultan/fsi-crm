import Link from "next/link"
import { Card, CardHeader } from "@/components/ui/card"
import type { Dashboard } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, NO_STATUS_LABEL } from "@/lib/leads/status"
import { n, percent, plural } from "./format"

function Bar({ share }: { share: number }) {
  return (
    <span className="block h-2.5 rounded-full bg-surface-sunken">
      <span
        className="hatch block h-full rounded-full text-accent"
        style={{ width: `${share * 100}%`, minWidth: share > 0 ? 4 : 0 }}
      />
    </span>
  )
}

export function PipelineCard({ data, salesId }: { data: Dashboard; salesId: string }) {
  const widest = Math.max(...LEAD_STATUSES.map((status) => data.byStatus[status]), 1)
  const withStatus = data.total - data.noStatus

  return (
    <Card>
      <CardHeader
        title="Pipeline by status"
        meta={`Where ${plural(withStatus, "lead with a status stands", "leads with a status stand")} today`}
      />

      <ul className="flex flex-col">
        {LEAD_STATUSES.map((status) => (
          <li key={status}>
            <Link
              href={leadsHref({ status, sales: salesId })}
              title={status}
              className="group flex min-h-11 flex-col justify-center gap-1.5 py-1.5"
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="group-hover:underline">{LEAD_STATUS_SHORT[status]}</span>
                <span className="tabular-nums">{n(data.byStatus[status])}</span>
              </span>
              <Bar share={data.byStatus[status] / widest} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Its own scale: these leads outnumber every status and would flatten the bars above. */}
      <div className="mt-3 border-t border-line pt-3">
        <Link
          href={leadsHref({ status: "none", sales: salesId })}
          className="group flex min-h-11 flex-col justify-center gap-1.5 py-1.5"
        >
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="group-hover:underline">{NO_STATUS_LABEL}</span>
            <span className="tabular-nums">{n(data.noStatus)}</span>
          </span>
          <Bar share={data.total > 0 ? data.noStatus / data.total : 0} />
          <span className="text-xs text-muted">
            {percent(data.noStatus, data.total) ?? "0%"} of all {n(data.total)} leads. This bar is measured against
            the total, not against the statuses above.
          </span>
        </Link>
      </div>

      <dl className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-4 text-sm">
        <dt className="text-muted">With a site survey date</dt>
        <dd className="tabular-nums">{n(data.siteSurveys)}</dd>
      </dl>
    </Card>
  )
}
