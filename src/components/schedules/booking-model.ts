import { isTime, localDay, localTime, timeWithZone, toUtc } from "@/lib/schedules/time"
import { MAX, isEmail, validateTiming, type FieldErrors } from "@/lib/schedules/validate"
import { OFFICE_TIME_ZONE, zoneForLocation, zoneLabel, type TimeZoneId } from "@/lib/schedules/zones"
import { isDay } from "@/lib/leads/dates"
import {
  SCHEDULE_KIND_LABEL,
  type CreateScheduleInput,
  type RescheduleScheduleInput,
  type ScheduleActionResult,
  type ScheduleKind,
  type ScheduleView,
} from "@/lib/schedules/types"
import { whenText } from "./model"

// The booking form's rules on the browser side: what it starts with, what it
// refuses before sending, what it sends, and how the server's answer is read
// back as one line per step. The server checks everything again.

export type BookingValues = {
  kind: ScheduleKind
  /** The customer's local day in `timeZone`, YYYY-MM-DD */
  date: string
  /** HH:MM in `timeZone` */
  startTime: string
  endTime: string
  /** The zone the date and times are typed in: the customer's. */
  timeZone: TimeZoneId
  allDay: boolean
  title: string
  location: string
  notes: string
  /** sales_users.id, "" for nobody. Only sent by an Admin. */
  salesId: string
  notifyLead: boolean
}

/** The lead the form books for. */
export type BookingLead = {
  id: number
  name: string
  location: string | null
  email: string | null
  salesId: string | null
}

export function defaultTitle(kind: ScheduleKind, name: string) {
  return `${SCHEDULE_KIND_LABEL[kind]}: ${name}`
}

/** A follow-up has a start time only; an all-day item has no times. */
export function showsTimes(values: Pick<BookingValues, "allDay">) {
  return !values.allDay
}
export function showsEndTime(values: Pick<BookingValues, "kind" | "allDay">) {
  return !values.allDay && values.kind !== "follow_up"
}

/**
 * `date` is the day the calendar was opened on; a day before today falls back
 * to today. The zone is guessed from the lead's location (WITA when unknown).
 */
export function createValues(lead: BookingLead, today: string, date?: string): BookingValues {
  return {
    kind: "appointment",
    date: date && date >= today ? date : today,
    startTime: "",
    endTime: "",
    timeZone: zoneForLocation(lead.location).zone,
    allDay: false,
    title: defaultTitle("appointment", lead.name),
    location: lead.location?.trim() ?? "",
    notes: "",
    salesId: lead.salesId ?? "",
    notifyLead: false,
  }
}

export function rescheduleValues(item: ScheduleView, emailAvailable: boolean): BookingValues {
  return {
    kind: item.kind,
    date: item.day,
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    timeZone: item.timeZone,
    allDay: item.allDay,
    title: item.title,
    location: item.location ?? "",
    notes: item.notes ?? "",
    salesId: item.salesId ?? "",
    notifyLead: emailAvailable && item.notifyLead,
  }
}

/** Changing the kind keeps a title the user typed, and follows it while it is still the default. */
export function withKind(values: BookingValues, kind: ScheduleKind, name: string): BookingValues {
  const title = values.title.trim() === defaultTitle(values.kind, name) ? defaultTitle(kind, name) : values.title
  return { ...values, kind, title, endTime: kind === "follow_up" ? "" : values.endTime }
}

function tooLong(value: string, field: "title" | "location" | "notes", errors: FieldErrors) {
  if (value.trim().length > MAX[field]) errors[field] = `Keep this under ${MAX[field]} characters.`
}

/** Today in the zone the form is in: the first day the customer can be booked on. */
export function zoneToday(zone: TimeZoneId, now: Date) {
  return localDay(now, zone)
}

/** The checks the browser can make before sending, "today" read in the chosen zone. Empty when the form may be sent. */
export function validateBooking(mode: "create" | "reschedule", values: BookingValues, now: Date): FieldErrors {
  const errors: FieldErrors = {}
  validateTiming(
    values.kind,
    {
      date: values.date,
      startTime: values.startTime,
      endTime: showsEndTime(values) ? values.endTime : "",
      allDay: values.allDay,
    },
    zoneToday(values.timeZone, now),
    errors,
    values.timeZone,
  )
  if (mode === "create") {
    tooLong(values.title, "title", errors)
    tooLong(values.location, "location", errors)
    tooLong(values.notes, "notes", errors)
  }
  return errors
}

function times(values: BookingValues) {
  if (values.allDay) return { allDay: true }
  const end = showsEndTime(values) && values.endTime ? { endTime: values.endTime } : {}
  return { allDay: false, startTime: values.startTime, ...end }
}

export function toCreateInput(
  leadId: number,
  values: BookingValues,
  options: { admin: boolean; canPickSales: boolean },
): CreateScheduleInput {
  const text = (value: string) => value.trim() || undefined
  return {
    leadId,
    kind: values.kind,
    date: values.date,
    ...times(values),
    timeZone: values.timeZone,
    title: text(values.title),
    location: text(values.location),
    notes: text(values.notes),
    ...(options.admin && options.canPickSales ? { salesId: values.salesId || null } : {}),
    notifyLead: values.notifyLead,
  }
}

export function toRescheduleInput(item: ScheduleView, values: BookingValues): RescheduleScheduleInput {
  return {
    scheduleId: item.id,
    loadedUpdatedAt: item.updatedAt,
    date: values.date,
    ...times({ ...values, kind: item.kind }),
    timeZone: values.timeZone,
    notifyLead: values.notifyLead,
  }
}

// ------------------------------------------------------------------ time zone

/** "Lombok" from "lombok", "Labuan Bajo" from "labuan bajo". */
function placeName(phrase: string) {
  return phrase.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

/**
 * The amber note under the zone picker when the guess from the location is
 * not safe: nothing recognised (set to WITA), or places in more than one zone.
 * Null when the location names places in one zone only.
 */
export function zoneHint(location: string | null | undefined): string | null {
  const match = zoneForLocation(location)
  if (match.confident) return null
  if (!match.matched) return "Location unknown or unclear, so this is set to WITA. Check the customer's city."
  return `The location names places in more than one zone; matched ${placeName(match.matched)}, please check.`
}

/**
 * The typed times again in Bali, under the time fields when the zone is not
 * WITA: "10:00 to 11:00 WIB · 11:00 to 12:00 WITA in Bali". Says when Bali is
 * on another day. Null for WITA, all day, or while the start is not a time yet.
 */
export function officeTimeLine(values: Pick<BookingValues, "kind" | "date" | "startTime" | "endTime" | "allDay" | "timeZone">) {
  if (values.allDay || values.timeZone === OFFICE_TIME_ZONE || !isTime(values.startTime)) return null
  const end = showsEndTime(values) && isTime(values.endTime) && values.endTime > values.startTime ? values.endTime : null
  // The offsets are fixed, so any day converts the same; the typed one tells whether Bali is on another day.
  const day = isDay(values.date) ? values.date : "2026-01-15"
  const start = toUtc(day, values.startTime, values.timeZone)
  const officeEnd = end ? localTime(toUtc(day, end, values.timeZone), OFFICE_TIME_ZONE) : null
  const shift = localDay(start, OFFICE_TIME_ZONE).localeCompare(day)
  const other = shift === 0 ? "" : shift > 0 ? ", the next day" : ", the day before"
  return `${timeWithZone(values.startTime, end, values.timeZone)} · ${timeWithZone(localTime(start, OFFICE_TIME_ZONE), officeEnd, OFFICE_TIME_ZONE)} in Bali${other}`
}

/** The server's "needs the time zone migration" refusal, in words for staff. Other messages pass through. */
export function bookingErrorMessage(message: string, zone: TimeZoneId) {
  if (!/time zone migration/i.test(message)) return message
  return `Nothing was saved: bookings in ${zoneLabel(zone)} are not switched on yet (a database update is still pending). Ask the owner to apply it, or book in WITA for now.`
}

// ------------------------------------------------------------------ email

export type EmailChoice = { available: true; to: string } | { available: false; reason: string }

/** Whether "Email the lead" can be ticked, and why not. */
export function emailChoice(email: string | null, emailConnected: boolean): EmailChoice {
  if (!emailConnected) return { available: false, reason: "Email to leads is not set up yet, so the lead cannot be emailed." }
  const address = email?.trim() ?? ""
  if (!address) return { available: false, reason: "This lead has no email address. Add one with Edit to email them." }
  if (!isEmail(address)) return { available: false, reason: `The lead's email address (${address}) is not valid. Fix it with Edit to email them.` }
  return { available: true, to: address }
}

/** What the cancel dialog says about emailing the lead. Mirrors the server: only a lead who got the invitation hears about the cancellation. */
export function cancelEmailNote(item: ScheduleView, emailConnected: boolean) {
  const invited = item.notifyLead && item.email.status === "sent" && item.email.sentAt !== null
  if (!invited) return "The lead will not be emailed: they were never sent an invitation for this."
  const to = item.email.to ?? "the lead"
  if (!emailConnected) return `${to} got the invitation, but email to leads is not set up now, so no cancellation email can go out.`
  return `${to} got the invitation, so they will be emailed a cancellation.`
}

// ------------------------------------------------------------------ result summary

export type ScheduleAction = "create" | "reschedule" | "cancel" | "done"

/** ok: it happened. info: nothing to do. warn: not connected or missing, amber. fail: tried and failed, pink. */
export type LineTone = "ok" | "info" | "warn" | "fail"
export type SummaryLine = { key: string; tone: LineTone; text: string }

type Done = Extract<ScheduleActionResult, { ok: true }>

const SAVED: Record<ScheduleAction, (schedule: ScheduleView) => string> = {
  create: (schedule) => `Saved in the CRM for ${whenText(schedule)}.`,
  reschedule: (schedule) => `Moved in the CRM to ${whenText(schedule)}.`,
  cancel: () => "Cancelled in the CRM.",
  done: () => "Marked done in the CRM.",
}

const NOT_EMAILED: Record<ScheduleAction, string> = {
  create: "The lead was not emailed: you did not ask for it.",
  reschedule: "The lead was not emailed: you did not ask for it.",
  cancel: "The lead was not emailed: they never got an invitation.",
  done: "The lead is not emailed when an item is marked done.",
}

const LEGACY_TONE: Record<Done["steps"]["legacy"]["status"], LineTone> = {
  updated: "ok",
  cleared: "ok",
  unchanged: "info",
  kept_manual: "info",
  skipped: "info",
  failed: "fail",
}

const GOOGLE_TONE: Record<Done["steps"]["google"]["status"], LineTone> = {
  synced: "ok",
  removed: "ok",
  skipped: "info",
  not_connected: "warn",
  failed: "fail",
}

const EMAIL_TONE: Record<Done["steps"]["email"]["status"], LineTone> = {
  sent: "ok",
  not_requested: "info",
  no_address: "warn",
  not_connected: "warn",
  failed: "fail",
}

/** One short line per step of a saved change, never claiming a step that did not happen. */
export function summarizeResult(result: Done, action: ScheduleAction): SummaryLine[] {
  const { legacy, google, email } = result.steps
  const lines: SummaryLine[] = [
    { key: "saved", tone: "ok", text: SAVED[action](result.schedule) },
    {
      key: "legacy",
      tone: LEGACY_TONE[legacy.status],
      text: legacy.message || "The lead's date in the old CRM did not need to change.",
    },
    {
      key: "google",
      tone: GOOGLE_TONE[google.status],
      text: google.message || "Google Calendar had nothing to change.",
    },
    {
      key: "email",
      tone: EMAIL_TONE[email.status],
      text: email.message || NOT_EMAILED[action],
    },
  ]
  if (result.recordError) lines.push({ key: "record", tone: "fail", text: result.recordError })
  return lines
}

/** True when any line needs the user's attention. */
export function hasWarnings(lines: SummaryLine[]) {
  return lines.some((line) => line.tone === "warn" || line.tone === "fail")
}
