import { formatPhone, normalizePhone } from "@/lib/phone"

// Plain helpers shared by server and client customer components.

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Makassar",
})

const BALI_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" })

// For `date` columns ("2026-11-12"): no time zone shift.
export function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date)
}

/** "Fri, 14 Nov 2026" for a `date` column. */
export function formatDayLong(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : DAY_FORMAT.format(date)
}

// For timestamps, shown in Bali time (WITA), where the team works.
export function formatDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_TIME_FORMAT.format(date)
}

/** The Bali day ("YYYY-MM-DD") of a timestamp, or today when none is given. */
export function baliDay(value: string | Date = new Date()) {
  return BALI_DAY.format(typeof value === "string" ? new Date(value) : value)
}

// Today's date in Bali as "YYYY-MM-DD", comparable with `date` columns.
export function todayInBali() {
  return baliDay()
}

/** Whole days from one "YYYY-MM-DD" to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000)
}

export function dayCount(days: number) {
  return days === 1 ? "1 day" : `${days.toLocaleString("en-US")} days`
}

// Call and WhatsApp links read the number with the same normalizer as WhatsApp
// matching (src/lib/phone.ts), so the list, the profile and the inbox agree.
export function whatsappUrl(phone: string | null) {
  const digits = normalizePhone(phone)
  return digits ? `https://wa.me/${digits}` : null
}

export function telUrl(phone: string | null) {
  const digits = normalizePhone(phone)
  return digits ? `tel:+${digits}` : null
}

/**
 * The stored number written for reading ("081337774426" is "+62 813 3777 4426").
 * A value the normalizer cannot read is shown as typed and marked, so the UI can mute it.
 */
export function readablePhone(phone: string | null): { text: string; readable: boolean } | null {
  const raw = phone?.trim()
  // "-" or "n/a" is a placeholder someone typed, not a number.
  if (!raw || !/\d/.test(raw)) return null
  const digits = normalizePhone(raw)
  return digits ? { text: formatPhone(digits), readable: true } : { text: raw.replace(/^'+/, ""), readable: false }
}

export function customerName(name: string | null) {
  return name?.trim() || "Unnamed customer"
}

export function personName(person: { name: string | null; username: string | null } | null) {
  return person?.name?.trim() || person?.username?.trim() || null
}
