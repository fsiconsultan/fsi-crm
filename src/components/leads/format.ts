import { addDays, dayOf, daysBetween, formatDay, today } from "@/lib/leads/dates"
import { normalizePhone } from "@/lib/phone"

export function leadName(name: string | null) {
  return name?.trim() || "Unnamed lead"
}

// Call and WhatsApp links read a stored number with the same normalizer as
// WhatsApp matching (src/lib/phone.ts), so both agree on what a number is.
export function whatsappHref(phone: string | null) {
  const digits = normalizePhone(phone)
  return digits ? `https://wa.me/${digits}` : null
}

export function telHref(phone: string | null) {
  const digits = normalizePhone(phone)
  return digits ? `tel:+${digits}` : null
}

export function daysInStatus(statusStartedAt: string | null) {
  return statusStartedAt ? Math.max(0, daysBetween(dayOf(statusStartedAt), today())) : null
}

export function dayCount(days: number) {
  return days === 1 ? "1 day" : `${days.toLocaleString("en-US")} days`
}

export function followUp(date: string | null) {
  if (!date) return null
  const now = today()
  const diff = daysBetween(now, date)
  const sameYear = date.slice(0, 4) === now.slice(0, 4)
  const label =
    diff === 0 ? "today" : date === addDays(now, 1) ? "tomorrow" : formatDay(date, !sameYear)
  return { label, overdue: diff < 0, due: diff <= 0 }
}

export function addedOn(createdAt: string) {
  const day = dayOf(createdAt)
  return formatDay(day, day.slice(0, 4) !== today().slice(0, 4))
}
