import { localDay } from "./time"
import { OFFICE_TIME_ZONE, type TimeZoneId } from "./zones"

// iCalendar (RFC 5545) file for the email to the lead. Pure: no clock, no I/O.
// Lines end in CRLF and are folded at 75 octets; times are written in UTC, so
// every calendar app shows them right in its own zone.

export type IcsMethod = "REQUEST" | "CANCEL"

export type IcsEvent = {
  method: IcsMethod
  /** Stable across every version of the same schedule. */
  uid: string
  /** Incremented on every reschedule and on cancel. */
  sequence: number
  /** When this version was produced (DTSTAMP). */
  stamp: Date
  startsAt: string
  endsAt: string | null
  allDay: boolean
  /** The booking's zone; only used for the dates of an all-day item. Default WITA. */
  timeZone?: TimeZoneId
  summary: string
  description?: string
  location?: string | null
  organizer: { name: string; email: string }
  attendee?: { name: string | null; email: string } | null
}

/** Escape a TEXT value: backslash, semicolon, comma and line breaks. */
export function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
}

/** A quoted parameter value (CN=...) may not hold a double quote or a control character. */
function paramValue(value: string) {
  return `"${value.replace(/["\r\n\x00-\x1f]/g, "").trim()}"`
}

const encoder = new TextEncoder()

/**
 * Fold one content line so no physical line is longer than 75 octets
 * (continuation lines start with one space, which counts). Never splits a
 * UTF-8 character.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ""
  let currentBytes = 0
  let limit = 75
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (currentBytes + bytes > limit) {
      parts.push(current)
      current = ""
      currentBytes = 0
      limit = 74 // the leading space takes one octet
    }
    current += char
    currentBytes += bytes
  }
  parts.push(current)
  return parts.join("\r\n ")
}

/** 20261120T020000Z */
export function utcStamp(value: string | Date) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** All-day dates are the booking's local day as YYYYMMDD. */
function localDate(iso: string, zone: TimeZoneId) {
  return localDay(iso, zone).replace(/-/g, "")
}

export function buildIcs(event: IcsEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "PRODID:-//French Solar Industry//FSI CRM//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${Math.max(0, Math.trunc(event.sequence))}`,
    `DTSTAMP:${utcStamp(event.stamp)}`,
  ]

  if (event.allDay) {
    const zone = event.timeZone ?? OFFICE_TIME_ZONE
    lines.push(`DTSTART;VALUE=DATE:${localDate(event.startsAt, zone)}`)
    if (event.endsAt) lines.push(`DTEND;VALUE=DATE:${localDate(event.endsAt, zone)}`)
  } else {
    lines.push(`DTSTART:${utcStamp(event.startsAt)}`)
    if (event.endsAt) lines.push(`DTEND:${utcStamp(event.endsAt)}`)
  }

  lines.push(`SUMMARY:${escapeText(event.summary)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  lines.push(`ORGANIZER;CN=${paramValue(event.organizer.name)}:mailto:${event.organizer.email}`)
  if (event.attendee) {
    const cn = event.attendee.name ? `;CN=${paramValue(event.attendee.name)}` : ""
    lines.push(`ATTENDEE${cn};ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:${event.attendee.email}`)
  }
  lines.push(`STATUS:${event.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`)
  lines.push("TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR")

  return lines.map(foldLine).join("\r\n") + "\r\n"
}
