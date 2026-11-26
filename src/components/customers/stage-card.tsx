import { CalendarClock, Check, X } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { IconCircle, type Tint } from "@/components/ui/icon-circle"
import type { Customer } from "@/lib/data/customers"
import type { LeadStatus } from "@/lib/leads/status"
import { KIND_ICON } from "@/components/schedules/kind"
import { ZoneTime } from "@/components/schedules/zone-time"
import { SCHEDULE_KIND_LABEL, type ScheduleView } from "@/lib/schedules/types"
import { formatDayLong } from "./format"
import { EditLink } from "./profile-context"
import {
  MILESTONES,
  nextStep,
  setMilestones,
  stepperState,
  timeInStage,
  type MilestoneKey,
  type NextStep,
  type StageState,
} from "./profile-model"

// A vertical timeline (owner: the horizontal stepper "fell off and messy").
// One row per stage on a rail: a check for stages already passed, a solid blue
// dot for the stage they are at ("now"), a hollow dot for stages ahead. The
// pipeline dates sit on the stage they belong to, so nothing floats apart.
const dotTone: Record<StageState, string> = {
  done: "bg-accent/40 text-accent",
  current: "bg-accent ring-4 ring-accent/20",
  todo: "border-2 border-line bg-surface",
}

const labelTone: Record<StageState, string> = {
  done: "text-ink",
  current: "font-medium text-ink",
  todo: "text-muted",
}

const stateWord: Record<StageState, string> = { done: "passed", current: "current stage", todo: "ahead" }

// Which pipeline dates belong to which stage.
const STAGE_DATES: Partial<Record<LeadStatus, MilestoneKey[]>> = {
  "First Meeting / Appointment / Site Survey": ["appointment", "site_survey"],
  "Quotation": ["quotation"],
  "Deal": ["closing"],
}

/** "Where they are": a vertical timeline New to Deal with each stage's dates on it. */
export function StageCard({ customer, today }: { customer: Customer; today: string }) {
  const stepper = stepperState(customer.status)
  const since = timeInStage(customer.status, customer.status_started_at, today)
  const dates = new Map(setMilestones(customer).map((d) => [d.key, d]))
  const firstEmpty = MILESTONES.find((m) => !customer[m.key])?.key ?? "appointment"
  const lost = stepper.noDeal === "current"

  return (
    <Card className="max-md:p-4">
      <CardHeader title="Where they are" meta={stepper.summary} />

      <ol aria-label="Pipeline stages" className="relative">
        {stepper.stages.map((stage, index) => {
          const last = index === stepper.stages.length - 1 && !lost
          const stageDates = (STAGE_DATES[stage.status] ?? []).map((key) => dates.get(key)).filter((d) => d !== undefined)
          return (
            <li key={stage.status} className="relative flex gap-3 pb-4 last:pb-0">
              {!last ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[9px] top-6 bottom-0 w-0.5 rounded-full ${stage.state === "done" ? "bg-accent/40" : "bg-line"}`}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${dotTone[stage.state]}`}
              >
                {stage.state === "done" ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className={`text-sm ${labelTone[stage.state]}`}>
                    {stage.label}
                    <span className="sr-only">, {stateWord[stage.state]}</span>
                  </span>
                  {stage.state === "current" && since ? <span className="text-xs text-muted">{since}</span> : null}
                </div>
                {stageDates.length > 0 ? (
                  <dl className="mt-1 flex flex-col gap-0.5">
                    {stageDates.map((date) => (
                      <div key={date.key} className="flex gap-2 text-xs">
                        <dt className="text-muted">{date.label}</dt>
                        <dd className="tabular-nums text-ink">{date.date}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </li>
          )
        })}
        {lost ? (
          <li className="relative flex gap-3">
            <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-negative text-surface">
              <X className="size-3" strokeWidth={3} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium text-negative">
                No deal<span className="sr-only">, current status</span>
              </span>
              {since ? <span className="text-xs text-muted">{since}</span> : null}
            </div>
          </li>
        ) : null}
      </ol>

      <div className="mt-4 border-t border-line pt-3">
        {dates.size < MILESTONES.length ? <EditLink field={firstEmpty}>Add a date</EditLink> : <EditLink field="appointment">Change dates</EditLink>}
      </div>
    </Card>
  )
}

const stepTint: Record<Extract<NextStep, { kind: "followup" }>["tone"], Tint> = {
  overdue: "pink",
  today: "blue",
  upcoming: "grey",
  closed: "grey",
}

const stepBox: Record<Extract<NextStep, { kind: "followup" }>["tone"], string> = {
  overdue: "bg-negative-soft",
  today: "bg-accent-soft",
  upcoming: "bg-surface-raised border border-line",
  closed: "bg-surface-raised border border-line",
}

const stepTitle: Record<Extract<NextStep, { kind: "followup" }>["tone"], string> = {
  overdue: "text-negative",
  today: "text-ink",
  upcoming: "text-ink",
  closed: "text-muted",
}

const scheduleBox = {
  today: "bg-accent-soft",
  later: "bg-surface-raised border border-line",
} as const

const scheduleTint: Record<keyof typeof scheduleBox, Tint> = { today: "blue", later: "grey" }

/**
 * "Next step": the soonest upcoming schedule when there is one; otherwise the
 * follow-up date, overdue in pink, or a way to set one.
 */
export function NextStepCard({
  customer,
  today,
  next = null,
}: {
  customer: Customer
  today: string
  /** The soonest upcoming schedule (from lead_schedules), when the table is set up. */
  next?: ScheduleView | null
}) {
  if (next) return <NextScheduleCard next={next} today={today} />
  const step = nextStep(customer.status, customer.follow_up_date, today)

  return (
    <Card className="max-md:p-4">
      <CardHeader title="Next step" meta={`Today is ${formatDayLong(today)}`} />
      {step.kind === "none" ? (
        <div className="flex items-start gap-3">
          <IconCircle icon={CalendarClock} tint="grey" />
          <div className="min-w-0">
            <p className="text-sm font-medium">No follow-up set</p>
            <p className="mb-1 text-[13px] text-muted">Pick the day you will contact them next, so it shows on your schedule.</p>
            <EditLink field="follow_up_date">Add a follow-up date</EditLink>
          </div>
        </div>
      ) : (
        <div className={`flex items-start gap-3 rounded-[12px] p-3 ${stepBox[step.tone]}`}>
          <IconCircle icon={CalendarClock} tint={stepTint[step.tone]} />
          <div className="min-w-0">
            <p className={`text-[15px] font-medium ${stepTitle[step.tone]}`}>{step.title}</p>
            <p className="mb-1 text-[13px] text-ink">{step.detail}</p>
            <EditLink field="follow_up_date">Change the date</EditLink>
          </div>
        </div>
      )}
    </Card>
  )
}

function NextScheduleCard({ next, today }: { next: ScheduleView; today: string }) {
  const when = next.officeDay === today ? "today" : "later"
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Next step" meta={`Today is ${formatDayLong(today)}`} />
      <div className={`flex items-start gap-3 rounded-[12px] p-3 ${scheduleBox[when]}`}>
        <IconCircle icon={KIND_ICON[next.kind]} tint={scheduleTint[when]} />
        <div className="min-w-0">
          <p className="break-words text-[15px] font-medium text-ink">{next.title}</p>
          <p className="text-[13px] text-ink">
            {SCHEDULE_KIND_LABEL[next.kind]} · <ZoneTime item={next} today={today} />
          </p>
          {next.location ? <p className="break-words text-[13px] text-muted">{next.location}</p> : null}
          <a
            href="#schedule"
            className="mt-1 inline-flex min-h-11 items-center text-[13px] font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-[120ms] hover:decoration-ink md:min-h-8"
          >
            See the schedule
          </a>
        </div>
      </div>
    </Card>
  )
}
