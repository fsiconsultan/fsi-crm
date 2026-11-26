import { isDay } from "@/lib/leads/dates"
import { isTime, localDay, nextDayStart, toUtc } from "./time"
import { isScheduleKind, type ScheduleField, type ScheduleKind } from "./types"
import { isTimeZone, OFFICE_TIME_ZONE, type TimeZoneId } from "./zones"

// Hand-written validation (zod is not a dependency). Every value comes from the
// browser, so each one is type-checked before it is read.

export const MAX = { title: 200, location: 300, notes: 2000 } as const
export const DEFAULT_MINUTES = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}

/** Syntactic check only; nothing is sent to a doubtful address. */
export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
      value,
    ) &&
    !value.includes("..")
  )
}

export type FieldErrors = Partial<Record<ScheduleField, string>>
export type Timing = { startsAt: string; endsAt: string | null; allDay: boolean }

function optionalText(value: unknown, field: ScheduleField, max: number, errors: FieldErrors): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") {
    errors[field] = "This value is not valid."
    return null
  }
  const text = value.replace(/\r\n?/g, "\n").trim()
  if (text.length > max) errors[field] = `Keep this under ${max} characters.`
  return text || null
}

function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

/**
 * A local day + times in `zone` to UTC. `today` is today's day in that same
 * zone (`localDay(now, zone)`); the default zone is WITA.
 */
export function validateTiming(
  kind: ScheduleKind,
  input: { date?: unknown; startTime?: unknown; endTime?: unknown; allDay?: unknown },
  today: string,
  errors: FieldErrors,
  zone: TimeZoneId = OFFICE_TIME_ZONE,
): Timing | null {
  const allDay = input.allDay === true
  const date = typeof input.date === "string" ? input.date.trim() : ""
  if (!isDay(date)) {
    errors.date = "Pick a valid date."
    return null
  }
  if (date < today) {
    errors.date = "Pick today or a later date."
    return null
  }

  // Times sent with an all-day item are ignored rather than refused.
  if (allDay) {
    const startsAt = toUtc(date, "00:00", zone)
    return { startsAt, endsAt: kind === "follow_up" ? null : nextDayStart(date, zone), allDay: true }
  }

  const start = typeof input.startTime === "string" ? input.startTime.trim() : ""
  if (!isTime(start)) {
    errors.startTime = "Pick a start time (HH:MM), or mark it all day."
    return null
  }
  const startsAt = toUtc(date, start, zone)

  const end = typeof input.endTime === "string" ? input.endTime.trim() : ""
  if (kind === "follow_up") {
    if (end) {
      errors.endTime = "A follow-up has a start time only."
      return null
    }
    return { startsAt, endsAt: null, allDay: false }
  }
  if (!end) return { startsAt, endsAt: addMinutes(startsAt, DEFAULT_MINUTES), allDay: false }
  if (!isTime(end) || end <= start) {
    errors.endTime = "The end time must be after the start time, on the same day."
    return null
  }
  return { startsAt, endsAt: toUtc(date, end, zone), allDay: false }
}

/** An optional zone from the browser: undefined when absent; anything but the three IANA names is a field error. */
export function parseTimeZone(value: unknown, errors: FieldErrors): TimeZoneId | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (isTimeZone(value)) return value
  errors.timeZone = "Choose WIB, WITA or WIT."
  return undefined
}

export type ValidCreate = {
  leadId: number
  kind: ScheduleKind
  title: string | null
  timing: Timing
  /** The zone `timing` was read in. */
  timeZone: TimeZoneId
  /** True when the input named the zone (staff override). */
  zoneGiven: boolean
  location: string | null
  notes: string | null
  /** undefined: use the lead's salesperson (Admin) or the actor (others). */
  salesId: string | null | undefined
  notifyLead: boolean
}

export function validateCreate(
  raw: unknown,
  ctx: { now: Date; admin: boolean; actorId: string; defaultZone?: TimeZoneId },
): { ok: true; value: ValidCreate } | { ok: false; fieldErrors: FieldErrors } {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const errors: FieldErrors = {}

  const leadId = Number(input.leadId)
  if (!Number.isSafeInteger(leadId) || leadId <= 0) errors.leadId = "Choose a lead."

  const kind = input.kind
  if (!isScheduleKind(kind)) errors.kind = "Choose appointment, site survey, call or follow-up."

  const title = optionalText(input.title, "title", MAX.title, errors)
  const location = optionalText(input.location, "location", MAX.location, errors)
  const notes = optionalText(input.notes, "notes", MAX.notes, errors)

  if (input.notifyLead !== undefined && typeof input.notifyLead !== "boolean") errors.notifyLead = "This value is not valid."

  let salesId: string | null | undefined
  if (ctx.admin) {
    if (input.salesId === undefined) salesId = undefined
    else if (input.salesId === null || input.salesId === "") salesId = null
    else if (isUuid(input.salesId)) salesId = input.salesId
    else errors.salesId = "Choose a salesperson from the list."
  } else {
    if (input.salesId !== undefined && input.salesId !== null && input.salesId !== "" && input.salesId !== ctx.actorId) {
      errors.salesId = "You can only schedule for yourself. Ask an Admin to schedule for someone else."
    }
    salesId = ctx.actorId
  }

  const given = parseTimeZone(input.timeZone, errors)
  const timeZone = given ?? ctx.defaultZone ?? OFFICE_TIME_ZONE

  // Checked even when the kind is invalid, so every field error shows at once.
  const timing = validateTiming(isScheduleKind(kind) ? kind : "appointment", input, localDay(ctx.now, timeZone), errors, timeZone)

  if (Object.keys(errors).length > 0 || !timing || !isScheduleKind(kind)) return { ok: false, fieldErrors: errors }
  return {
    ok: true,
    value: {
      leadId,
      kind,
      title,
      timing,
      timeZone,
      zoneGiven: given !== undefined,
      location,
      notes,
      salesId,
      notifyLead: input.notifyLead === true,
    },
  }
}

export function validateRef(raw: unknown): { scheduleId: string; loadedUpdatedAt: string } | null {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  if (!isUuid(input.scheduleId) || typeof input.loadedUpdatedAt !== "string") return null
  return { scheduleId: input.scheduleId, loadedUpdatedAt: input.loadedUpdatedAt }
}
