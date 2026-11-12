import { cn } from "@/lib/cn"
import type { Customer } from "@/lib/data/customers"
import { formatDate, todayInBali } from "./format"

const STEPS = [
  { key: "appointment", label: "Appointment" },
  { key: "site_survey", label: "Site survey" },
  { key: "quotation", label: "Quotation" },
  { key: "closing", label: "Closing" },
  { key: "follow_up_date", label: "Follow-up" },
] as const

// The five pipeline dates in the order the work happens. Markers reuse the
// DESIGN.md motif: hatched = already happened, solid accent = today or still
// ahead, hollow = no date yet. The text next to each marker says the same.
export function PipelineTimeline({ customer }: { customer: Customer }) {
  const today = todayInBali()
  const closed = customer.status === "Deal" || customer.status === "No Deal"

  return (
    <ol className="flex flex-col">
      {STEPS.map((step, index) => {
        const value = customer[step.key]
        const date = formatDate(value)
        const day = value?.slice(0, 10) ?? null
        const past = day !== null && day < today
        const overdue = step.key === "follow_up_date" && past && !closed
        const timing = !date ? null : day === today ? "Today" : overdue ? "Overdue" : past ? "Done" : "Upcoming"
        const last = index === STEPS.length - 1

        return (
          <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
            {!last ? (
              <span aria-hidden="true" className="absolute bottom-0 left-[7px] top-5 w-px bg-line" />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-[15px] shrink-0 rounded-full",
                !date && "border border-[color-mix(in_srgb,var(--muted)_75%,transparent)] bg-surface",
                date && past && "hatch border border-accent text-accent",
                date && !past && "bg-accent",
              )}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-sm tabular-nums">
                {date ? (
                  <>
                    {date}
                    <span className={cn("ml-2 text-[13px]", overdue ? "font-medium text-negative" : "text-muted")}>
                      {timing}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">No date set</span>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
