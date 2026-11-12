import { addDays, dayOf, daysBetween, formatDay, today } from "@/lib/leads/dates"

export function leadName(name: string | null) {
  return name?.trim() || "Unnamed lead"
}

/** wa.me link for a stored phone number, or null when it cannot be a full number. */
export function whatsappHref(phone: string | null) {
  let digits = (phone ?? "").replace(/\D/g, "")
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`
  return digits.length >= 9 && digits.length <= 15 ? `https://wa.me/${digits}` : null
}

/** tel: link for a stored phone number, or null when it has too few digits to dial. */
export function telHref(phone: string | null) {
  const cleaned = (phone ?? "").replace(/[^\d+]/g, "")
  return cleaned.replace(/\D/g, "").length >= 6 ? `tel:${cleaned}` : null
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
