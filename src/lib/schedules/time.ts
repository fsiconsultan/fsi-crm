import { addDays, dayOf } from "@/lib/leads/dates"
import { OFFICE_TIME_ZONE, TIME_ZONES, zoneLabel, type TimeZoneId } from "./zones"

// Every booking has its own Indonesian time zone (lead_schedules.time_zone,
// zones.ts). Its day and HH:MM are read in that zone and stored in UTC. None of
// the three zones has daylight saving, so each is a fixed offset. Staff views
// group by the office's (Bali, WITA) days; the WITA wrappers below are for them.

export function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** A local day + HH:MM in `zone` to a UTC ISO string. */
export function toUtc(day: string, time = "00:00", zone: TimeZoneId = OFFICE_TIME_ZONE) {
  return new Date(`${day}T${time}:00${TIME_ZONES[zone].offset}`).toISOString()
}

type Formatters = { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat; longEn: Intl.DateTimeFormat; longId: Intl.DateTimeFormat; shortEn: Intl.DateTimeFormat }
const cache = new Map<TimeZoneId, Formatters>()

function formatters(zone: TimeZoneId): Formatters {
  let found = cache.get(zone)
  if (!found) {
    found = {
      day: new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }),
      time: new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      longEn: new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      longId: new Intl.DateTimeFormat("id-ID", { timeZone: zone, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      shortEn: new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }),
    }
    cache.set(zone, found)
  }
  return found
}

/** The calendar day (YYYY-MM-DD) of a timestamp in `zone`. */
export function localDay(timestamp: string | Date, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  return formatters(zone).day.format(typeof timestamp === "string" ? new Date(timestamp) : timestamp)
}

/** HH:MM of a UTC timestamp in `zone`. */
export function localTime(iso: string, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  return formatters(zone).time.format(new Date(iso))
}

/** Start of the next local day, for all-day ends. */
export function nextDayStart(day: string, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  return toUtc(addDays(day, 1), "00:00", zone)
}

// WITA (office) wrappers, kept for staff views and older callers.
export const WITA_OFFSET = TIME_ZONES["Asia/Makassar"].offset

/** Bali day + HH:MM to a UTC ISO string. */
export function witaToUtc(day: string, time = "00:00") {
  return toUtc(day, time, "Asia/Makassar")
}

/** HH:MM in Bali of a UTC timestamp. */
export function witaTime(iso: string) {
  return localTime(iso, "Asia/Makassar")
}

export { dayOf }

export type When = { startsAt: string; endsAt: string | null; allDay: boolean }

/** "Friday 20 November 2026, 10:00 to 11:00 WIB" */
export function whenEnglish({ startsAt, endsAt, allDay }: When, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  const date = formatters(zone).longEn.format(new Date(startsAt)).replace(",", "")
  if (allDay) return `${date}, all day`
  const end = endsAt ? ` to ${localTime(endsAt, zone)}` : ""
  return `${date}, ${localTime(startsAt, zone)}${end} ${zoneLabel(zone)}`
}

/** "Jumat, 20 November 2026, pukul 10.00 sampai 11.00 WIB" */
export function whenIndonesian({ startsAt, endsAt, allDay }: When, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  const date = formatters(zone).longId.format(new Date(startsAt))
  if (allDay) return `${date}, sepanjang hari`
  const dot = (iso: string) => localTime(iso, zone).replace(":", ".")
  const end = endsAt ? ` sampai ${dot(endsAt)}` : ""
  return `${date}, pukul ${dot(startsAt)}${end} ${zoneLabel(zone)}`
}

/** "Fri 20 Nov, 10:00 WIB" for short messages. */
export function whenShort({ startsAt, allDay }: When, zone: TimeZoneId = OFFICE_TIME_ZONE) {
  const date = formatters(zone).shortEn.format(new Date(startsAt)).replace(",", "")
  return allDay ? `${date}, all day` : `${date}, ${localTime(startsAt, zone)} ${zoneLabel(zone)}`
}

/** "10:00 WIB", or "10:00 to 11:00 WIB". */
export function timeWithZone(startTime: string, endTime: string | null, zone: TimeZoneId) {
  return `${startTime}${endTime ? ` to ${endTime}` : ""} ${zoneLabel(zone)}`
}
