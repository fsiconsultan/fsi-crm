import Link from "next/link"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import { LEAD_IMPORT_LAST_DAY, WEEKS_SHOWN, type Dashboard } from "@/lib/data/dashboard"
import { formatDay } from "@/lib/leads/dates"
import { n } from "./format"

type Week = Dashboard["weeks"][number]

// Past weeks hatched, the week in progress solid: the identity motif.
const barTone = {
  current: "bar-solid rounded-[6px]",
  past: "hatch hatch-fade rounded-t-[6px] text-accent",
} as const

// Answers "are new leads still coming in?". Weeks that hold the one-off import
// of earlier leads are left out (LEAD_IMPORT_LAST_DAY), so until 12 weeks have
// passed the chart has fewer bars and the meta says where it starts.
export function WeeklyCard({ weeks, afterImport }: { weeks: Dashboard["weeks"]; afterImport: boolean }) {
  const since = weeks[0] ? `Since ${formatDay(weeks[0].start)}` : ""
  const meta = afterImport ? since : `Last ${WEEKS_SHOWN} weeks`

  return (
    <Card className="flex h-full flex-col">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] font-medium leading-6">New leads by week</h2>
        <p className="text-xs text-muted">{meta}</p>
      </header>
      <WeeklyChart weeks={weeks} afterImport={afterImport} meta={meta} />
    </Card>
  )
}

function WeeklyChart({ weeks, afterImport, meta }: { weeks: Week[]; afterImport: boolean; meta: string }) {
  const counts = weeks.map((week) => week.count)
  const [highest = 0, second = 0] = [...counts].sort((a, b) => b - a)

  if (highest === 0) {
    return (
      <EmptyState
        title={`No leads were added ${meta.toLowerCase()}`}
        detail="Add a lead and it appears in this week's bar."
        action={
          <Link href="/leads/new" className={buttonClass("secondary")}>
            Add a lead
          </Link>
        }
      />
    )
  }

  // One week far above the rest would flatten every other bar, so it is cut at
  // the next busiest week's height and shows its real value above it.
  const cut = second > 0 && highest > second * 3
  const scale = Math.max(cut ? second : highest, 1)
  const first = weeks[0]
  const last = weeks.at(-1)

  return (
    <div className="flex flex-1 flex-col">
      {/* A fixed height where the card sizes to its content; on the one-screen desktop grid it fills the card. */}
      <div aria-hidden="true" className="flex h-44 items-end gap-1.5 pt-5 xl:h-auto xl:min-h-32 xl:flex-1">
        {weeks.map((week) => {
          const clipped = cut && week.count > scale
          const share = week.count === 0 ? 0 : Math.max(0.02, Math.min(1, week.count / scale))
          return (
            <div key={week.start} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className={`relative w-[62%] max-w-7 ${barTone[week.current ? "current" : "past"]}`}
                style={{ height: `${share * 100}%` }}
              >
                {week.current || clipped ? (
                  <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-[13px] font-semibold text-ink tabular-nums">
                    {n(week.count)}
                  </span>
                ) : null}
                {clipped ? <span className="absolute inset-x-0 top-2 h-1 bg-surface" /> : null}
              </div>
            </div>
          )
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] text-muted tabular-nums">
        <span>{first ? formatDay(first.start) : ""}</span>
        <span>{last && last !== first ? formatDay(last.start) : ""}</span>
      </div>

      {/* A table ignores the 1px width of sr-only, so the wrapper carries it. */}
      <div className="sr-only">
        <table>
          <caption>
            New leads per week, {meta.toLowerCase()}, by the Monday each week starts on.
            {afterImport ? ` Earlier weeks hold the one-off import of leads that ended ${formatDay(LEAD_IMPORT_LAST_DAY, true)}.` : ""}
          </caption>
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
      </div>
    </div>
  )
}
