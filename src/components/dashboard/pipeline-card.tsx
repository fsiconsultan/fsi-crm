import Link from "next/link"
import type { ReactNode } from "react"
import { Card, CardHeader, CardHeaderLink } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import type { Dashboard } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, OPEN_STATUSES, type LeadStatus } from "@/lib/leads/status"
import { n, percent } from "./format"

type Kind = "total" | "segment" | "result"

type Step = {
  key: string
  kind: Kind
  label: string
  count: number
  /** Bar position as fractions of the total. */
  start: number
  end: number
  /** The leads list for this bar; null where no list filter matches it exactly. */
  href: string | null
}

// Hatched grey for the total, hatched pink for the stages taken off it, solid blue for the result.
const barTone: Record<Kind, string> = {
  total: "hatch text-muted",
  segment: "hatch text-negative",
  result: "bar-solid",
}

const valueTone: Record<Kind, string> = {
  total: "text-ink",
  segment: "text-negative",
  result: "text-ink",
}

const TICKS = [0, 0.25, 0.5, 0.75, 1]

const tickPlace = ["left-0", "-translate-x-1/2", "-translate-x-1/2", "-translate-x-1/2", "right-0"]

// "Where the pipeline stands" as a waterfall (DESIGN.md slot mapping): every lead
// with a status, then each open stage and No deal taken off it in turn, ending
// with Deal. Leads with no status are left out and counted in the callout.
export function PipelineCard({ data, salesId }: { data: Dashboard; salesId: string }) {
  const withStatus = data.total - data.noStatus

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Where the pipeline stands"
        meta={`${n(withStatus)} leads with a status, today`}
        action={
<CardHeaderLink href={salesId ? `/pipeline?sales=${salesId}` : "/pipeline"}>Pipeline</CardHeaderLink>
        }
      />
      <Waterfall data={data} salesId={salesId} withStatus={withStatus} />
    </Card>
  )
}

function Waterfall({ data, salesId, withStatus }: { data: Dashboard; salesId: string; withStatus: number }) {
  if (withStatus === 0) {
    return (
      <EmptyState
        title="No lead has a status yet"
        detail="Set a status on a lead and it shows here, stage by stage."
        action={
          <Link href={leadsHref({ sales: salesId, status: "none" })} className="text-sm font-medium underline underline-offset-4">
            Open leads with no status
          </Link>
        }
      />
    )
  }

  const taken: LeadStatus[] = [...OPEN_STATUSES, "No Deal"]
  // Statuses outside the seven known ones (if any) get their own segment, so the bars add up.
  const other = withStatus - LEAD_STATUSES.reduce((sum, status) => sum + data.byStatus[status], 0)

  let used = 0
  const take = (key: string, label: string, count: number, href: string | null): Step => {
    const end = 1 - used / withStatus
    used += count
    return { key, kind: "segment", label, count, start: 1 - used / withStatus, end, href }
  }

  const steps: Step[] = [
    { key: "total", kind: "total", label: "With a status", count: withStatus, start: 0, end: 1, href: null },
    ...taken.map((status) =>
      take(status, LEAD_STATUS_SHORT[status], data.byStatus[status], leadsHref({ status, sales: salesId })),
    ),
    ...(other > 0 ? [take("other", "Other status", other, null)] : []),
    {
      key: "Deal",
      kind: "result",
      label: "Deal",
      count: data.byStatus["Deal"],
      start: 0,
      end: data.byStatus["Deal"] / withStatus,
      href: leadsHref({ status: "Deal", sales: salesId }),
    },
  ]

  const largest = OPEN_STATUSES.reduce((top, status) => (data.byStatus[status] > data.byStatus[top] ? status : top))

  return (
    <div className="flex flex-col">
      <ol className="flex flex-col gap-1">
        {steps.map((step, index) => (
          <li key={step.key} className="relative flex flex-col justify-end">
            {index > 0 ? (
              // Dashed connector from the end of the bar above down to where this bar picks up.
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-2.5 border-l border-dashed border-muted/60"
                style={{ left: `${step.end * 100}%` }}
              />
            ) : null}
            <StepWrap href={step.href}>
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="-mx-1 bg-surface px-1 group-hover:underline">{step.label}</span>
                <span className={`-mx-1 bg-surface px-1 tabular-nums ${valueTone[step.kind]}`}>
                  {n(step.count)}
                  {step.kind === "total" ? "" : ` · ${percent(step.count, withStatus)}`}
                </span>
              </span>
              <span aria-hidden="true" className="relative block h-3">
                <span
                  className={`absolute inset-y-0 rounded-[4px] ${barTone[step.kind]}`}
                  style={{
                    left: `${step.start * 100}%`,
                    width: `${(step.end - step.start) * 100}%`,
                    minWidth: step.count > 0 ? (step.kind === "result" ? 18 : 4) : 0,
                  }}
                />
              </span>
            </StepWrap>
          </li>
        ))}
      </ol>

      <div aria-hidden="true" className="relative mt-2 h-4 text-[11px] text-muted tabular-nums">
        {TICKS.map((tick, index) => (
          <span key={tick} className={`absolute top-0 ${tickPlace[index]}`} style={index > 0 && index < 4 ? { left: `${tick * 100}%` } : undefined}>
            {tick * 100}%
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-[12px] bg-surface-raised px-4 py-3">
        <p className="text-[13px] font-medium">
          {LEAD_STATUS_SHORT[largest]} is the largest open stage: {n(data.byStatus[largest])} of {n(withStatus)} leads (
          {percent(data.byStatus[largest], withStatus)}).
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {data.noStatus > 0
            ? `${n(data.noStatus)} leads with no status are not counted here.`
            : "Every lead has a status, so all of them are counted."}
        </p>
      </div>
    </div>
  )
}

function StepWrap({ href, children }: { href: string | null; children: ReactNode }) {
  const className = "group relative flex flex-col gap-1.5 pt-2"
  if (!href) return <div className={className}>{children}</div>
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
