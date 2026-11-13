"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { flushSync } from "react-dom"
import type { SalesChoices } from "@/components/customers/edit-customer"
import { Button, buttonClass } from "@/components/ui/button"
import { controlClass } from "@/components/ui/control"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria } from "@/components/ui/field"
import { PillSelect } from "@/components/ui/pill-select"
import { createSchedule, rescheduleSchedule } from "@/lib/schedules/actions"
import { MAX, type FieldErrors } from "@/lib/schedules/validate"
import { TIME_ZONES, TIME_ZONE_IDS, zoneDescription, type TimeZoneId } from "@/lib/schedules/zones"
import {
  SCHEDULE_KINDS,
  SCHEDULE_KIND_LABEL,
  type ScheduleField,
  type ScheduleKind,
  type ScheduleView,
} from "@/lib/schedules/types"
import {
  bookingErrorMessage,
  createValues,
  emailChoice,
  officeTimeLine,
  rescheduleValues,
  showsEndTime,
  showsTimes,
  summarizeResult,
  toCreateInput,
  toRescheduleInput,
  validateBooking,
  withKind,
  zoneHint,
  zoneToday,
  type BookingLead,
  type BookingValues,
  type SummaryLine,
} from "./booking-model"
import { bookingLeadOf, placeLine, type CustomerHit } from "./customer-search"
import { CustomerStep } from "./customer-step"
import { KIND_ICON } from "./kind"
import { whenText } from "./model"
import { ResultSummary } from "./result-summary"
import type { ScheduleEnv } from "./schedule-provider"

/**
 * The customer being booked and the form's values; null while the customer is
 * still to be picked. `zoneHint`: the amber note on a guessed zone, until the
 * user picks a zone themselves.
 */
type Draft = { lead: BookingLead; place: string; values: BookingValues; zoneHint: string | null }

type Outcome = { kind: "done"; lines: SummaryLine[] } | { kind: "error"; message: string; stale: boolean } | null

// Focus goes to the first field that needs fixing, in the order they appear.
const FIELD_ORDER: ScheduleField[] = ["kind", "timeZone", "date", "startTime", "endTime", "title", "location", "notes", "salesId", "notifyLead"]

// A radio styled as a pill: the tinted header pill, ink when chosen. The radio
// itself is visually hidden but keeps arrow keys and the form semantics.
const kindPillClass =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-line/70 px-4 text-sm font-medium whitespace-nowrap text-ink transition-colors duration-[120ms] hover:bg-line has-checked:bg-ink has-checked:text-ink-contrast has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent md:h-10"

const checkboxRowClass = "flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm has-disabled:cursor-not-allowed"
const checkboxClass = "mt-0.5 size-5 shrink-0 accent-ink disabled:opacity-50"

function salesOptions(sales: SalesChoices, current: string) {
  if (!sales?.ok) return null
  const people = sales.options
    .filter((person) => person.status !== "Inactive" || person.id === current)
    .map((person) => ({ value: person.id, label: person.name ?? person.username ?? "Unnamed user" }))
  return [{ value: "", label: "Nobody yet" }, ...people]
}

function firstDraft(
  props: { env: ScheduleEnv; lead: BookingLead | null } & (
    | { mode: "create"; date?: string }
    | { mode: "reschedule"; item: ScheduleView }
  ),
): Draft | null {
  const { lead, env } = props
  if (!lead) return null
  const values =
    props.mode === "create"
      ? createValues(lead, env.today, props.date)
      : rescheduleValues(props.item, emailChoice(lead.email, env.emailConnected).available)
  return { lead, place: "", values, zoneHint: props.mode === "create" ? zoneHint(lead.location) : null }
}

/**
 * Books a new schedule, or moves an existing one. The form checks what the
 * browser can (date, times, length) and the server checks everything again.
 * After saving, the dialog shows each step's outcome (saved, old CRM date,
 * Google Calendar, email) instead of closing, so a failed step is never missed.
 * Opened from the Calendar (`lead` null) it starts with a customer search in
 * the same dialog, then continues as on the customer's page.
 */
export function BookingDialog(
  props: {
    env: ScheduleEnv
    sales: SalesChoices
    open: boolean
    onClose: () => void
  } & (
    | {
        mode: "create"
        /** Null: pick the customer first (the Calendar). */
        lead: BookingLead | null
        /** The day the form starts on (Bali), when opened from a day. */
        date?: string
        /** Runs once the schedule is saved. */
        onSaved?: (schedule: ScheduleView) => void
        item?: undefined
      }
    | { mode: "reschedule"; lead: BookingLead; item: ScheduleView }
  ),
) {
  const { env, open, onClose, mode } = props
  const router = useRouter()
  const id = useId()
  const [draft, setDraft] = useState<Draft | null>(() => firstDraft(props))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [pending, startTransition] = useTransition()
  const picking = props.mode === "create" && props.lead === null
  const bodyId = `${id}-body`

  // The step that replaces the focused control puts the cursor on its own first field.
  const focusStep = () => document.getElementById(bodyId)?.querySelector<HTMLElement>("[data-autofocus]")?.focus()

  const pick = (hit: CustomerHit) => {
    const lead = bookingLeadOf(hit)
    flushSync(() => {
      setDraft({
        lead,
        place: placeLine(hit),
        values: createValues(lead, env.today, props.mode === "create" ? props.date : undefined),
        zoneHint: zoneHint(lead.location),
      })
      setErrors({})
      setOutcome(null)
    })
    focusStep()
  }

  const changeCustomer = () => {
    flushSync(() => {
      setDraft(null)
      setErrors({})
      setOutcome(null)
    })
    focusStep()
  }

  if (!draft) {
    return (
      <Dialog open={open} onClose={onClose} title="New schedule" description="Find the customer first. Times go in the customer's time zone.">
        <div id={bodyId}>
          <CustomerStep onPick={pick} />
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </div>
      </Dialog>
    )
  }

  const { lead, values } = draft
  const email = emailChoice(lead.email, env.emailConnected)
  const options = mode === "create" && env.admin ? salesOptions(props.sales, lead.salesId ?? "") : null
  const kindLabel = SCHEDULE_KIND_LABEL[values.kind]
  const setValues = (next: BookingValues) => setDraft({ ...draft, values: next })
  const set = (patch: Partial<BookingValues>) => setValues({ ...values, ...patch })
  const fieldId = (field: ScheduleField) => `${id}-${field}`
  const officeLine = officeTimeLine(values)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateBooking(mode, values, new Date())
    setErrors(found)
    setOutcome(null)
    const first = FIELD_ORDER.find((field) => found[field])
    if (first) {
      document.getElementById(fieldId(first))?.focus()
      return
    }
    startTransition(async () => {
      try {
        const result =
          props.mode === "create"
            ? await createSchedule(toCreateInput(lead.id, values, { admin: env.admin, canPickSales: options !== null }))
            : await rescheduleSchedule(toRescheduleInput(props.item, values))
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {})
          setOutcome({ kind: "error", message: bookingErrorMessage(result.message, values.timeZone), stale: result.stale === true })
          return
        }
        setOutcome({ kind: "done", lines: summarizeResult(result, mode) })
        if (props.mode === "create") props.onSaved?.(result.schedule)
      } catch {
        setOutcome({
          kind: "error",
          message: "Nothing was saved: the server could not be reached. Check your connection and try again.",
          stale: false,
        })
      }
    })
  }

  const reload = () => {
    router.refresh()
    onClose()
  }

  if (outcome?.kind === "done") {
    return (
      <Dialog open={open} onClose={onClose} title={mode === "create" ? `${kindLabel} booked` : `${kindLabel} moved`}>
        <ResultSummary lines={outcome.lines} />
        <DialogFooter>
          {picking ? (
            <Link href={`/customers/${lead.id}`} className={buttonClass("secondary")}>
              Open customer
            </Link>
          ) : null}
          <Button variant="primary" onClick={onClose} autoFocus>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    )
  }

  const title = props.mode === "create" ? `Book with ${lead.name}` : `Move ${props.item.title}`
  const description =
    props.mode === "create"
      ? "Times are in the customer's time zone."
      : `Now ${whenText(props.item, env.today)}. Times are in the customer's time zone.`

  return (
    <Dialog open={open} onClose={onClose} busy={pending} dismissOnBackdrop={false} title={title} description={description}>
      <form id={bodyId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {outcome?.kind === "error" ? (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
            <p>
              {outcome.stale
                ? "Someone changed this item since you opened the page. Nothing was saved. Reload to see the latest, then try again."
                : outcome.message}
            </p>
            {outcome.stale ? <Button onClick={reload}>Reload</Button> : null}
          </div>
        ) : null}

        {picking ? <ChosenCustomer name={lead.name} place={draft.place} onChange={changeCustomer} disabled={pending} /> : null}

        {props.mode === "create" ? (
          <KindPicker
            id={fieldId("kind")}
            value={values.kind}
            error={errors.kind}
            onChange={(kind) => setValues(withKind(values, kind, lead.name))}
          />
        ) : null}

        <ZonePicker
          id={fieldId("timeZone")}
          value={values.timeZone}
          error={errors.timeZone}
          hint={draft.zoneHint}
          onChange={(timeZone) => setDraft({ ...draft, values: { ...values, timeZone }, zoneHint: null })}
        />

        <Field label="Date" htmlFor={fieldId("date")} error={errors.date}>
          <input
            id={fieldId("date")}
            type="date"
            min={zoneToday(values.timeZone, new Date())}
            value={values.date}
            onChange={(event) => set({ date: event.target.value })}
            className={controlClass}
            data-autofocus={props.mode === "reschedule" || undefined}
            {...fieldAria(fieldId("date"), errors.date)}
          />
        </Field>

        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={values.allDay}
            onChange={(event) => set({ allDay: event.target.checked })}
            className={checkboxClass}
          />
          <span>All day, no set time</span>
        </label>

        {showsTimes(values) ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={values.kind === "follow_up" ? "Time" : "Start"} htmlFor={fieldId("startTime")} error={errors.startTime}>
              <input
                id={fieldId("startTime")}
                type="time"
                value={values.startTime}
                onChange={(event) => set({ startTime: event.target.value })}
                className={controlClass}
                {...fieldAria(fieldId("startTime"), errors.startTime)}
              />
            </Field>
            {showsEndTime(values) ? (
              <Field label="End" htmlFor={fieldId("endTime")} error={errors.endTime} hint="Empty: one hour.">
                <input
                  id={fieldId("endTime")}
                  type="time"
                  value={values.endTime}
                  onChange={(event) => set({ endTime: event.target.value })}
                  className={controlClass}
                  {...fieldAria(fieldId("endTime"), errors.endTime, true)}
                />
              </Field>
            ) : null}
            {officeLine ? (
              <p className="col-span-2 text-[13px] text-muted tabular-nums" aria-live="polite">
                {officeLine}
              </p>
            ) : null}
          </div>
        ) : null}

        {props.mode === "create" ? (
          <>
            <TextField id={fieldId("title")} label="Title" error={errors.title} value={values.title} max={MAX.title} onChange={(title) => set({ title })} />
            <TextField
              id={fieldId("location")}
              label="Location"
              error={errors.location}
              value={values.location}
              max={MAX.location}
              onChange={(location) => set({ location })}
            />
            <Field label="Notes" htmlFor={fieldId("notes")} error={errors.notes} hint="Only staff see notes. They are never emailed.">
              <textarea
                id={fieldId("notes")}
                rows={3}
                maxLength={MAX.notes}
                value={values.notes}
                onChange={(event) => set({ notes: event.target.value })}
                className={`${controlClass} py-2.5`}
                {...fieldAria(fieldId("notes"), errors.notes, true)}
              />
            </Field>
            <SalesField options={options} admin={env.admin} values={values} error={errors.salesId} onChange={(salesId) => set({ salesId })} />
          </>
        ) : null}

        <div id={fieldId("notifyLead")} tabIndex={-1} className="rounded-[var(--radius-control)] border border-line px-3 outline-none">
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={email.available && values.notifyLead}
              disabled={!email.available}
              onChange={(event) => set({ notifyLead: event.target.checked })}
              className={checkboxClass}
              aria-describedby={`${fieldId("notifyLead")}-why`}
            />
            <span className="min-w-0">
              <span className="block font-medium">Email the lead</span>
              <span id={`${fieldId("notifyLead")}-why`} className="block break-words text-[13px] text-muted">
                {email.available
                  ? `Sends a calendar invitation to ${email.to}, in English and Indonesian. Notes are not included.`
                  : email.reason}
              </span>
            </span>
          </label>
          {errors.notifyLead ? <p className="pb-2 text-[13px] text-negative">{errors.notifyLead}</p> : null}
        </div>

        <DialogFooter>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            <SubmitLabel mode={mode} kind={kindLabel} pending={pending} />
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function SubmitLabel({ mode, kind, pending }: { mode: "create" | "reschedule"; kind: string; pending: boolean }) {
  if (pending) return <>Saving…</>
  return <>{mode === "create" ? `Book ${kind.toLowerCase()}` : "Move it"}</>
}

function KindPicker({
  id,
  value,
  error,
  onChange,
}: {
  id: string
  value: ScheduleKind
  error?: string
  onChange: (kind: ScheduleKind) => void
}) {
  return (
    <fieldset id={id} tabIndex={-1} className="flex min-w-0 flex-col gap-1.5 outline-none" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium">Type</legend>
      <div className="flex flex-wrap gap-2">
        {SCHEDULE_KINDS.map((kind, index) => {
          const Icon = KIND_ICON[kind]
          return (
            <label key={kind} className={kindPillClass}>
              <input
                type="radio"
                name={`${id}-kind`}
                value={kind}
                checked={value === kind}
                onChange={() => onChange(kind)}
                className="sr-only"
                data-autofocus={index === 0 || undefined}
              />
              <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              {SCHEDULE_KIND_LABEL[kind]}
            </label>
          )
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

// A segmented control: three radios in one tinted track, the chosen one in ink.
// West to east, as on a map. Hover shows the long name; screen readers hear it
// as the radio's name.
const zoneSegmentClass =
  "relative flex h-11 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-full px-2 text-sm font-medium text-ink transition-colors duration-[120ms] hover:bg-line has-checked:bg-ink has-checked:text-ink-contrast has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent md:h-10 md:flex-row md:gap-1.5"

function ZonePicker({
  id,
  value,
  error,
  hint,
  onChange,
}: {
  id: string
  value: TimeZoneId
  error?: string
  /** Amber note when the zone was guessed from an unclear location. */
  hint: string | null
  onChange: (zone: TimeZoneId) => void
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
  return (
    <fieldset id={id} tabIndex={-1} className="flex min-w-0 flex-col gap-1.5 outline-none" aria-describedby={describedBy}>
      <legend className="mb-1.5 text-sm font-medium">Time zone</legend>
      <div className="flex gap-1 rounded-full bg-line/70 p-1">
        {TIME_ZONE_IDS.map((zone) => (
          <label key={zone} className={zoneSegmentClass} title={zoneDescription(zone)}>
            <input
              type="radio"
              name={`${id}-zone`}
              value={zone}
              checked={value === zone}
              onChange={() => onChange(zone)}
              className="sr-only"
            />
            <span aria-hidden="true">{TIME_ZONES[zone].short}</span>
            <span aria-hidden="true" className="text-xs font-normal">
              {TIME_ZONES[zone].utc}
            </span>
            <span className="sr-only">{zoneDescription(zone)}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="rounded-[var(--radius-control)] bg-warning-soft px-3 py-2 text-[13px] text-ink">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function TextField({
  id,
  label,
  error,
  value,
  max,
  onChange,
}: {
  id: string
  label: string
  error?: string
  value: string
  max: number
  onChange: (value: string) => void
}): ReactNode {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        type="text"
        maxLength={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
        {...fieldAria(id, error)}
      />
    </Field>
  )
}

function SalesField({
  options,
  admin,
  values,
  error,
  onChange,
}: {
  options: Array<{ value: string; label: string }> | null
  admin: boolean
  values: BookingValues
  error?: string
  onChange: (value: string) => void
}) {
  if (!admin) return null
  if (!options) {
    return <p className="text-[13px] text-muted">The sales team list could not be loaded, so the lead&apos;s salesperson is used.</p>
  }
  return <PillSelect name="salesId" label="Salesperson" defaultValue={values.salesId} options={options} error={error} onChange={onChange} />
}

/** The customer picked on the Calendar, with the way back to the search. */
function ChosenCustomer({
  name,
  place,
  onChange,
  disabled,
}: {
  name: string
  place: string
  onChange: () => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] text-muted">Customer</p>
        <p className="truncate text-sm font-medium">{name}</p>
        {place ? <p className="truncate text-[13px] text-muted">{place}</p> : null}
      </div>
      <Button variant="ghost" onClick={onChange} disabled={disabled} className="shrink-0 px-3">
        Change<span className="sr-only"> customer</span>
      </Button>
    </div>
  )
}
