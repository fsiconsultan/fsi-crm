import { emailConfig, sendEmail } from "@/lib/integrations/email"
import type { Env } from "@/lib/integrations/env"
import { cancelEvent, googleConfig, upsertEvent } from "@/lib/integrations/google-calendar"
import type { FetchLike } from "@/lib/integrations/probe"
import type { TablesUpdate } from "@/lib/supabase/database.types"
import { COMPANY, leadEmail, type EmailPurpose } from "./email-content"
import { buildIcs } from "./ics"
import { decideLegacyDate, LEGACY_LABEL } from "./legacy"
import type { LeadForSchedule, ScheduleEventType, ScheduleStore } from "./store"
import { dayOf, localDay, whenShort } from "./time"
import {
  kindsForColumn,
  LEGACY_COLUMN,
  SCHEDULE_KIND_LABEL,
  type EmailOutcome,
  type GoogleOutcome,
  type LegacyOutcome,
  type ScheduleActionResult,
  type ScheduleKind,
} from "./types"
import { isEmail, parseTimeZone, validateCreate, validateRef, validateTiming, type FieldErrors } from "./validate"
import { BOOKED_VIA_AI, toScheduleView, zoneOf, type ScheduleRow } from "./view"
import { OFFICE_TIME_ZONE, zoneForLocation, type TimeZoneId } from "./zones"

// The schedule workflow, independent of Next.js so it can be tested with fakes
// and reused by the WhatsApp assistant. Order for every change: save the row,
// mirror the legacy date on the lead, sync Google Calendar, email the lead,
// then record each outcome on the row. A step that did not happen is never
// reported as done (CLAUDE.md rule 5).

export type ScheduleActor = {
  /** sales_users.id; null for the WhatsApp assistant. */
  id: string | null
  admin: boolean
}

export type ScheduleDeps = {
  store: ScheduleStore
  actor: ScheduleActor
  env: Env
  fetchFn: FetchLike
  now: () => Date
  /** "https://crm.example.com", for the link in the calendar event. */
  baseUrl: string | null
  /**
   * Set only by the WhatsApp assistant's wiring (ai-booking.ts), never from
   * user input: new items are marked as booked by the assistant, and an item it
   * moves needs confirming again.
   */
  bookedVia?: typeof BOOKED_VIA_AI
}

type GoogleAction = "upsert" | "remove" | "none"

const GONE = "Nothing was saved: this schedule no longer exists or is not yours."
const STALE =
  "Nothing was saved: this schedule was changed by someone else since you opened it. Reload to see the latest, then try again."

function fail(message: string, fieldErrors?: FieldErrors, stale?: boolean): ScheduleActionResult {
  return { ok: false, message, ...(fieldErrors ? { fieldErrors } : {}), ...(stale ? { stale: true } : {}) }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function leadName(lead: Pick<LeadForSchedule, "id" | "customer_name">) {
  return lead.customer_name?.trim() || `Lead ${lead.id}`
}

// ------------------------------------------------------------------ legacy

async function mirrorLegacy(deps: ScheduleDeps, lead: LeadForSchedule, kind: ScheduleKind): Promise<LegacyOutcome> {
  const column = LEGACY_COLUMN[kind]
  const label = LEGACY_LABEL[column]
  const current = lead[column]
  try {
    const rows = await deps.store.listForLead(lead.id, kindsForColumn(column))
    const decision = decideLegacyDate(current, rows, dayOf(deps.now()))
    if (decision.action === "kept_manual") {
      return {
        status: "kept_manual",
        column,
        value: current,
        message: `The lead's ${label.toLowerCase()} date (${current}) was entered by hand, so it was left as it is.`,
      }
    }
    if (decision.action === "unchanged") {
      return { status: "unchanged", column, value: current, message: "" }
    }
    await deps.store.setLeadDate(lead.id, column, decision.value, deps.actor.id)
    return decision.value
      ? { status: "updated", column, value: decision.value, message: `The lead's ${label.toLowerCase()} date is now ${decision.value}.` }
      : { status: "cleared", column, value: null, message: `The lead's ${label.toLowerCase()} date was cleared.` }
  } catch (error) {
    return {
      status: "failed",
      column,
      value: current,
      message: `The lead's ${label.toLowerCase()} date in the old CRM could not be updated (${errorText(error)}).`,
    }
  }
}

// ------------------------------------------------------------------ google

async function syncGoogle(
  deps: ScheduleDeps,
  row: ScheduleRow,
  lead: LeadForSchedule,
  action: GoogleAction,
  salesName: string | null,
): Promise<{ outcome: GoogleOutcome; patch: TablesUpdate<"lead_schedules"> }> {
  if (action === "none") return { outcome: { status: "skipped", message: "" }, patch: {} }

  const config = googleConfig(deps.env)
  const failed = (message: string) => ({
    outcome: { status: "failed" as const, message: `Google Calendar was not updated: ${message}` },
    patch: { google_sync_status: "failed", google_error: message },
  })

  if (action === "remove") {
    if (!row.google_event_id) return { outcome: { status: "skipped", message: "" }, patch: {} }
    if (config.state === "missing") {
      return failed("Google Calendar is not connected now, so the event was not removed. Remove it by hand.")
    }
    if (config.state === "invalid") return failed(config.error.message)
    const result = await cancelEvent(config.config, row.google_event_id, deps)
    if (!result.ok) return failed(result.error.message)
    return {
      outcome: { status: "removed", message: "The Google Calendar event was removed." },
      patch: { google_sync_status: "synced", google_error: null, google_synced_at: deps.now().toISOString() },
    }
  }

  if (config.state === "missing") {
    return {
      outcome: { status: "not_connected", message: "Google Calendar is not connected, so no calendar event was made." },
      patch: { google_sync_status: "not_connected", google_error: null },
    }
  }
  if (config.state === "invalid") return failed(config.error.message)

  const link = deps.baseUrl && row.lead_id ? `${deps.baseUrl}/customers/${row.lead_id}` : null
  const description = [
    `${SCHEDULE_KIND_LABEL[row.kind as ScheduleKind]} for ${leadName(lead)}.`,
    `Salesperson: ${salesName ?? "not assigned"}.`,
    link ? `CRM: ${link}` : null,
    "Made by the FSI CRM. Change it in the CRM, not here.",
  ]
    .filter(Boolean)
    .join("\n")

  const result = await upsertEvent(
    config.config,
    {
      scheduleId: row.id,
      title: row.title,
      description,
      location: row.location,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: row.all_day,
      timeZone: zoneOf(row),
    },
    deps,
  )
  if (!result.ok) return failed(result.error.message)
  return {
    outcome: { status: "synced", message: "Google Calendar is updated." },
    patch: {
      google_event_id: result.eventId,
      google_sync_status: "synced",
      google_error: null,
      google_synced_at: deps.now().toISOString(),
    },
  }
}

// ------------------------------------------------------------------ email

async function emailLead(
  deps: ScheduleDeps,
  row: ScheduleRow,
  lead: LeadForSchedule,
  purpose: EmailPurpose | null,
  salesName: string | null,
): Promise<{ outcome: EmailOutcome; patch: TablesUpdate<"lead_schedules"> }> {
  if (!purpose) return { outcome: { status: "not_requested", message: "" }, patch: {} }

  const address = (lead.email ?? "").trim()
  if (!isEmail(address)) {
    const message = address
      ? `The lead's email address (${address}) is not valid, so no email was sent.`
      : "The lead has no email address, so no email was sent."
    return {
      outcome: { status: "no_address", message },
      patch: { email_status: "failed", email_error: message, lead_email_snapshot: address || null },
    }
  }

  const config = emailConfig(deps.env)
  if (config.state === "missing") {
    return {
      outcome: { status: "not_connected", message: "Email is not connected, so the lead was not emailed." },
      patch: { email_status: "not_connected", email_error: null, lead_email_snapshot: address },
    }
  }
  const failed = (message: string) => ({
    outcome: { status: "failed" as const, message: `The lead was not emailed: ${message}` },
    patch: { email_status: "failed", email_error: message, lead_email_snapshot: address },
  })
  if (config.state === "invalid") return failed(config.message)

  const contactEmail = config.config.replyTo ?? config.config.fromAddress
  const kind = row.kind as ScheduleKind
  const when = { startsAt: row.starts_at, endsAt: row.ends_at, allDay: row.all_day }
  const content = leadEmail({
    purpose,
    kind,
    when,
    timeZone: zoneOf(row),
    location: row.location,
    customerName: lead.customer_name,
    salesName,
    contactEmail,
  })
  const method = purpose === "cancelled" ? "CANCEL" : "REQUEST"
  const ics = buildIcs({
    method,
    uid: `${row.id}@fsi-crm`,
    sequence: row.ics_sequence,
    stamp: deps.now(),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    timeZone: zoneOf(row),
    summary: `${SCHEDULE_KIND_LABEL[kind]} with ${COMPANY}`,
    description: `With ${salesName ?? COMPANY}. Questions: ${contactEmail}`,
    location: row.location,
    organizer: { name: COMPANY, email: contactEmail },
    attendee: { name: lead.customer_name, email: address },
  })

  const result = await sendEmail(
    config.config,
    {
      to: address,
      subject: content.subject,
      text: content.text,
      attachment: {
        filename: purpose === "cancelled" ? "cancelled.ics" : "invite.ics",
        content: Buffer.from(ics, "utf8").toString("base64"),
        contentType: `text/calendar; charset=utf-8; method=${method}`,
      },
      idempotencyKey: `schedule-${row.id}-${row.ics_sequence}-${method}`,
    },
    deps.fetchFn,
    deps.env,
  )
  if (!result.ok) return failed(result.message)
  return {
    outcome: { status: "sent", message: `The lead was emailed at ${address}.` },
    patch: {
      email_status: "sent",
      email_error: null,
      email_sent_at: deps.now().toISOString(),
      email_message_id: result.messageId,
      lead_email_snapshot: address,
    },
  }
}

// ------------------------------------------------------------------ shared tail

async function logFailure(deps: ScheduleDeps, row: ScheduleRow, type: ScheduleEventType, summary: string) {
  if (!row.lead_id) return
  try {
    await deps.store.logEvent({
      type,
      leadId: row.lead_id,
      scheduleId: row.id,
      actorSalesId: deps.actor.id,
      summary: summary.slice(0, 500),
      detail: { kind: row.kind, starts_at: row.starts_at, status: row.status, time_zone: zoneOf(row) },
    })
  } catch (error) {
    console.error("automation_events insert failed", type, errorText(error))
  }
}

async function finish(
  deps: ScheduleDeps,
  row: ScheduleRow,
  lead: LeadForSchedule,
  saved: string,
  google: GoogleAction,
  email: EmailPurpose | null,
  mirror = true,
): Promise<Extract<ScheduleActionResult, { ok: true }>> {
  const salesName = row.sales_id ? await deps.store.salesName(row.sales_id) : null
  const legacy: LegacyOutcome = mirror
    ? await mirrorLegacy(deps, lead, row.kind as ScheduleKind)
    : { status: "skipped", column: null, value: null, message: "" }
  const googleStep = await syncGoogle(deps, row, lead, google, salesName)
  const emailStep = await emailLead(deps, row, lead, email, salesName)

  if (googleStep.outcome.status === "failed") {
    await logFailure(deps, row, "schedule_google_failed", googleStep.outcome.message)
  }
  if (emailStep.outcome.status === "failed") {
    await logFailure(deps, row, "schedule_email_failed", emailStep.outcome.message)
  }

  let final = row
  let recordError: string | undefined
  const patch = { ...googleStep.patch, ...emailStep.patch }
  if (Object.keys(patch).length > 0) {
    try {
      final = await deps.store.update(row.id, patch)
    } catch (error) {
      recordError = `The outcome above could not be saved on the schedule (${errorText(error)}).`
    }
  }

  const message = [saved, legacy.message, googleStep.outcome.message, emailStep.outcome.message, recordError]
    .filter(Boolean)
    .join(" ")
  return {
    ok: true,
    message,
    schedule: toScheduleView(final),
    steps: { legacy, google: googleStep.outcome, email: emailStep.outcome },
    ...(recordError ? { recordError } : {}),
  }
}

async function loadForChange(
  deps: ScheduleDeps,
  raw: unknown,
): Promise<{ ok: true; row: ScheduleRow; lead: LeadForSchedule } | { ok: false; result: ScheduleActionResult }> {
  const ref = validateRef(raw)
  if (!ref) return { ok: false, result: fail("Nothing was saved: the schedule reference is not valid.", { scheduleId: "Not valid." }) }
  let row: ScheduleRow | null
  let lead: LeadForSchedule | null = null
  try {
    row = await deps.store.get(ref.scheduleId)
    if (row?.lead_id) lead = await deps.store.getLead(row.lead_id)
  } catch (error) {
    return { ok: false, result: fail(`Nothing was saved: ${errorText(error)}. Try again.`) }
  }
  if (!row || !lead) return { ok: false, result: fail(GONE) }
  if (row.updated_at !== ref.loadedUpdatedAt) return { ok: false, result: fail(STALE, undefined, true) }
  if (row.status !== "scheduled") {
    return { ok: false, result: fail(`Nothing was saved: this item is already ${row.status === "done" ? "done" : "cancelled"}.`) }
  }
  return { ok: true, row, lead }
}

async function guardedSave(
  deps: ScheduleDeps,
  row: ScheduleRow,
  patch: TablesUpdate<"lead_schedules">,
): Promise<{ ok: true; row: ScheduleRow } | { ok: false; result: ScheduleActionResult }> {
  try {
    const saved = await deps.store.updateIfUnchanged(row.id, row.updated_at, patch)
    return saved ? { ok: true, row: saved } : { ok: false, result: fail(STALE, undefined, true) }
  } catch (error) {
    return { ok: false, result: fail(saveError(error)) }
  }
}

// Until migration 20261117090000 is applied the column does not exist. WITA
// bookings never send it (the column's default), so only other zones need it.
const NO_ZONE_COLUMN = "Nothing was saved: bookings outside Bali time (WITA) need the time zone migration (20261117090000) applied first."

function zoneColumn(zone: TimeZoneId): TablesUpdate<"lead_schedules"> {
  return zone === OFFICE_TIME_ZONE ? {} : { time_zone: zone }
}

function saveError(error: unknown) {
  const text = errorText(error)
  return /time_zone/.test(text) ? NO_ZONE_COLUMN : `Nothing was saved: ${text}. Try again.`
}

function pendingGoogle(deps: ScheduleDeps): TablesUpdate<"lead_schedules"> {
  return googleConfig(deps.env).state === "missing" ? {} : { google_sync_status: "pending" }
}

// ------------------------------------------------------------------ public

export async function createScheduleCore(deps: ScheduleDeps, raw: unknown): Promise<ScheduleActionResult> {
  if (!deps.actor.admin && !deps.actor.id) return fail("Nothing was saved: you are not signed in.")
  const ctx = { now: deps.now(), admin: deps.actor.admin, actorId: deps.actor.id ?? "" }
  // Before the lead (and so its zone) is known, check in WIB: the westernmost
  // zone, whose "today" is never later than the others', so a date valid for
  // the customer is never refused here. The lead's zone is applied below.
  const checked = validateCreate(raw, { ...ctx, defaultZone: "Asia/Jakarta" })
  if (!checked.ok) return fail("Nothing was saved. Fix the marked fields and try again.", checked.fieldErrors)
  let input = checked.value

  let lead: LeadForSchedule | null
  try {
    lead = await deps.store.getLead(input.leadId)
  } catch (error) {
    return fail(`Nothing was saved: ${errorText(error)}. Try again.`)
  }
  if (!lead) return fail("Nothing was saved: this lead no longer exists or is not assigned to you.")

  // No zone given: the one the lead's location points to (WITA when unknown).
  // The input was read in WIB above, so read it again in that zone.
  if (!input.zoneGiven) {
    const leadZone = zoneForLocation(lead.location).zone
    if (leadZone !== input.timeZone) {
      const again = validateCreate(raw, { ...ctx, defaultZone: leadZone })
      if (!again.ok) return fail("Nothing was saved. Fix the marked fields and try again.", again.fieldErrors)
      input = again.value
    }
  }

  const salesId = input.salesId === undefined ? (deps.actor.admin ? lead.sales_id : deps.actor.id) : input.salesId
  const googleState = googleConfig(deps.env).state

  let row: ScheduleRow
  try {
    row = await deps.store.insert({
      lead_id: lead.id,
      sales_id: salesId,
      kind: input.kind,
      title: input.title ?? `${SCHEDULE_KIND_LABEL[input.kind]}: ${leadName(lead)}`,
      starts_at: input.timing.startsAt,
      ends_at: input.timing.endsAt,
      all_day: input.timing.allDay,
      location: input.location,
      notes: input.notes,
      notify_lead: input.notifyLead,
      google_sync_status: googleState === "missing" ? "not_connected" : "pending",
      created_by: deps.actor.id,
      updated_by: deps.actor.id,
      ...zoneColumn(input.timeZone),
      ...(deps.bookedVia ? { booked_via: deps.bookedVia } : {}),
    })
  } catch (error) {
    return fail(saveError(error))
  }

  const saved = `${SCHEDULE_KIND_LABEL[input.kind]} saved for ${whenShort(
    { startsAt: row.starts_at, endsAt: row.ends_at, allDay: row.all_day },
    zoneOf(row),
  )}.`
  return finish(deps, row, lead, saved, "upsert", input.notifyLead ? "new" : null)
}

export async function rescheduleScheduleCore(deps: ScheduleDeps, raw: unknown): Promise<ScheduleActionResult> {
  const loaded = await loadForChange(deps, raw)
  if (!loaded.ok) return loaded.result
  const { row, lead } = loaded
  const input = raw as Record<string, unknown>

  const errors: FieldErrors = {}
  if (input.notifyLead !== undefined && typeof input.notifyLead !== "boolean") errors.notifyLead = "This value is not valid."
  // The booking keeps its zone unless a new one is given.
  const zone = parseTimeZone(input.timeZone, errors) ?? zoneOf(row)
  const timing = validateTiming(row.kind as ScheduleKind, input, localDay(deps.now(), zone), errors, zone)
  if (!timing || Object.keys(errors).length) return fail("Nothing was saved. Fix the marked fields and try again.", errors)

  const sameTime =
    zone === zoneOf(row) &&
    Date.parse(timing.startsAt) === Date.parse(row.starts_at) &&
    (timing.endsAt === null ? row.ends_at === null : row.ends_at !== null && Date.parse(timing.endsAt) === Date.parse(row.ends_at)) &&
    timing.allDay === row.all_day
  if (sameTime) return fail("Nothing was saved: that is the time it already has.", { date: "Pick a different time." })

  const notify = typeof input.notifyLead === "boolean" ? input.notifyLead : row.notify_lead
  const saved = await guardedSave(deps, row, {
    starts_at: timing.startsAt,
    ends_at: timing.endsAt,
    all_day: timing.allDay,
    previous_starts_at: row.starts_at,
    reschedule_count: row.reschedule_count + 1,
    ics_sequence: row.ics_sequence + 1,
    notify_lead: notify,
    updated_by: deps.actor.id,
    ...(zone !== zoneOf(row) ? { time_zone: zone } : {}),
    ...(deps.bookedVia ? { confirmed_at: null, confirmed_by: null } : {}),
    ...pendingGoogle(deps),
  })
  if (!saved.ok) return saved.result

  const message = `Moved to ${whenShort({ startsAt: timing.startsAt, endsAt: timing.endsAt, allDay: timing.allDay }, zone)}.`
  return finish(deps, saved.row, lead, message, "upsert", notify ? "rescheduled" : null)
}

export async function cancelScheduleCore(deps: ScheduleDeps, raw: unknown): Promise<ScheduleActionResult> {
  const loaded = await loadForChange(deps, raw)
  if (!loaded.ok) return loaded.result
  const { row, lead } = loaded

  const saved = await guardedSave(deps, row, {
    status: "cancelled",
    cancelled_at: deps.now().toISOString(),
    ics_sequence: row.ics_sequence + 1,
    updated_by: deps.actor.id,
  })
  if (!saved.ok) return saved.result

  // A cancellation is emailed only to a lead who was emailed the invitation.
  const tellLead = row.notify_lead && row.email_sent_at !== null
  return finish(deps, saved.row, lead, "Cancelled.", "remove", tellLead ? "cancelled" : null)
}

export async function markScheduleDoneCore(deps: ScheduleDeps, raw: unknown): Promise<ScheduleActionResult> {
  const loaded = await loadForChange(deps, raw)
  if (!loaded.ok) return loaded.result
  const { row, lead } = loaded

  const saved = await guardedSave(deps, row, {
    status: "done",
    completed_at: deps.now().toISOString(),
    updated_by: deps.actor.id,
  })
  if (!saved.ok) return saved.result
  return finish(deps, saved.row, lead, "Marked done.", "none", null)
}

/**
 * Staff confirm a booking the WhatsApp assistant made. Only the confirmation
 * is recorded: no calendar change and no email (the customer was answered in
 * WhatsApp). Refused for staff items, which need no confirmation.
 */
export async function confirmScheduleCore(deps: ScheduleDeps, raw: unknown): Promise<ScheduleActionResult> {
  if (!deps.actor.id) return fail("Nothing was saved: you are not signed in.")
  const loaded = await loadForChange(deps, raw)
  if (!loaded.ok) return loaded.result
  const { row, lead } = loaded
  if (row.booked_via !== BOOKED_VIA_AI) return fail("Nothing was saved: only items booked by the assistant need confirming.")
  if (row.confirmed_at) return fail("Nothing was saved: this item is already confirmed.")

  const saved = await guardedSave(deps, row, {
    confirmed_at: deps.now().toISOString(),
    confirmed_by: deps.actor.id,
    updated_by: deps.actor.id,
  })
  if (!saved.ok) return saved.result
  return finish(deps, saved.row, lead, "Confirmed.", "none", null, false)
}

/**
 * Before a lead is deleted: cancel its scheduled items and remove their Google
 * events. The lead is not emailed. Failures are logged while the lead still
 * exists; the delete goes ahead either way (the row trigger cancels anything
 * this user could not see).
 */
export async function cancelSchedulesBeforeLeadDelete(
  deps: ScheduleDeps,
  leadId: number,
): Promise<{ cancelled: number; googleFailures: number; error: string | null }> {
  let lead: LeadForSchedule | null
  let rows: ScheduleRow[]
  try {
    lead = await deps.store.getLead(leadId)
    rows = lead ? await deps.store.listForLead(leadId, ["appointment", "site_survey", "call", "follow_up"]) : []
  } catch (error) {
    return { cancelled: 0, googleFailures: 0, error: errorText(error) }
  }
  if (!lead) return { cancelled: 0, googleFailures: 0, error: null }

  let cancelled = 0
  let googleFailures = 0
  for (const row of rows.filter((item) => item.status === "scheduled")) {
    const saved = await guardedSave(deps, row, {
      status: "cancelled",
      cancelled_at: deps.now().toISOString(),
      ics_sequence: row.ics_sequence + 1,
      updated_by: deps.actor.id,
    })
    if (!saved.ok) continue
    cancelled += 1
    const result = await finish(deps, saved.row, lead, "", "remove", null, false)
    if (result.steps.google.status === "failed") googleFailures += 1
  }
  return { cancelled, googleFailures, error: null }
}
