import { addDays, dayOf, daysBetween, formatDay, today } from "@/lib/leads/dates"
import { normalizePhone } from "@/lib/phone"

export function leadName(name: string | null) {
  return name?.trim() || "Unnamed lead"
}

/**
 * Digits to dial for a stored phone number, country code first, or null when
 * it cannot be a full number. Uses the WhatsApp normalizer so links and
 * WhatsApp matching read numbers the same way: "812...", "0812...", "62812..."
 * and "+62 812..." are Indonesian, "00" means international, and only the
 * first of several numbers in one field is used.
 */
export function dialDigits(phone: string | null) {
  // normalizePhone reads a leading 8 as an Indonesian mobile number with the
  // country code missing. After a "+" it is a country code instead (+81 Japan,
  // +86 China, +84 Vietnam), so those numbers are passed through unchanged.
  const first = (phone ?? "").split(/[/,;]/)[0].trim()
  if (/^\+\s*8/.test(first)) {
    const digits = first.replace(/\D/g, "")
    return digits.length >= 10 && digits.length <= 15 ? digits : null
  }
  return normalizePhone(phone)
}

export function whatsappHref(phone: string | null) {
  const digits = dialDigits(phone)
  return digits ? `https://wa.me/${digits}` : null
}

export function telHref(phone: string | null) {
  const digits = dialDigits(phone)
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
