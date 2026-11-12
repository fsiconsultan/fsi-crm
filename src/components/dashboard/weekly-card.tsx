import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import { cn } from "@/lib/cn"
import { WEEKS_SHOWN, type Dashboard } from "@/lib/data/dashboard"
import { formatDay } from "@/lib/leads/dates"
import { n } from "./format"

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })

const CHART_HEIGHT = 160

// Answers "are new leads still coming in?". Hatched bars are past weeks, the
// solid bar is the week in progress.
export function WeeklyCard({ weeks }: { weeks: Dashboard["weeks"] }) {
  const counts = weeks.map((week) => week.count)
  const sorted = [...counts].sort((a, b) => b - a)
  const [highest, second] = sorted

  // One week far above the rest would flatten every other bar, so it is cut at
  // the next busiest week's height and its real value is stated under the chart.
  const cut = second > 0 && highest > second * 3
  const scale = Math.max(cut ? second : highest, 1)
  const outlier = cut ? weeks.find((week) => week.count === highest) : undefined

  return (
    <Card>
      <CardHeader title="New leads per week" meta={`Last ${WEEKS_SHOWN} weeks, by the day each lead was added`} />

      {highest === 0 ? (
        <EmptyState
          title={`No leads were added in the last ${WEEKS_SHOWN} weeks`}
          detail="This chart counts leads by the day they were added. Add a lead and it appears in the current week."
          action={
            <Link href="/leads/new" className={buttonClass("secondary")}>
              Add a lead
            </Link>
          }
        />
      ) : (
        <>
          <div aria-hidden="true" className="flex items-end gap-1 sm:gap-2">
            {weeks.map((week, index) => {
              const clipped = cut && week.count > scale
              const height = week.count === 0 ? 0 : Math.max(2, Math.min(1, week.count / scale) * CHART_HEIGHT)
              const newMonth = index === 0 || week.start.slice(5, 7) !== weeks[index - 1].start.slice(5, 7)
              return (
                <div key={week.start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      week.current ? "font-medium text-ink" : "text-muted",
                    )}
                  >
                    {week.count >= 1000 ? compact.format(week.count) : week.count}
                  </span>
                  <div className="flex w-full items-end" style={{ height: CHART_HEIGHT }}>
                    <div
                      className={cn(
                        "relative w-full rounded-t-[4px]",
                        week.current ? "bg-accent" : "hatch text-accent",
                      )}
                      style={{ height }}
                    >
                      {clipped ? <span className="absolute inset-x-0 top-2 h-1 bg-surface" /> : null}
                    </div>
                  </div>
                  <span className={cn("text-[11px] tabular-nums", week.current ? "text-ink" : "text-muted")}>
                    {Number(week.start.slice(8, 10))}
                  </span>
                  <span className="h-4 text-[11px] text-muted">
                    {newMonth ? formatDay(week.start).split(" ")[1] : ""}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] bg-accent" /> This week so far
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="hatch size-2.5 rounded-[2px] text-accent" /> Earlier weeks
            </span>
            <span>Each bar is labelled with the Monday it starts on.</span>
          </p>
          {outlier ? (
            <p className="mt-2 text-xs text-muted">
              The bar for the week of {formatDay(outlier.start)} is cut short: {n(outlier.count)} leads were added that
              week, against {n(second)} in the next busiest.
            </p>
          ) : null}

          <table className="sr-only">
            <caption>New leads per week, last {WEEKS_SHOWN} weeks</caption>
            <thead>
              <tr>
                <th scope="col">Week starting</th>
                <th scope="col">Leads added</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.start}>
                  <th scope="row">
                    {formatDay(week.start, true)}
                    {week.current ? " (this week so far)" : ""}
                  </th>
                  <td>{week.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}
