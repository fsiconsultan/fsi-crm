import { addDays, dayOf, daysBetween, formatDay, today } from "@/lib/leads/dates"
import { LEAD_STATUS_SHORT, isLeadStatus } from "@/lib/leads/status"
import { formatPhone, normalizePhone } from "@/lib/phone"

export function leadName(name: string | null) {
  return name?.trim() || "Unnamed lead"
}

// Call and WhatsApp links read a stored number with the same normalizer as
// WhatsApp matching (src/lib/phone.ts), so both agree on what a number is.
export function whatsappHref(phone: string | null) {
  const digits = normalizePhone(phone)
  return digits ? `https://wa.me/${digits}` : null
}

/**
 * A stored number written for reading: "081234567890" becomes "+62 812 3456 7890".
 * A value the normalizer cannot read is shown as typed, marked so the UI can mute it.
 */
export function displayPhone(phone: string | null): { text: string; readable: boolean } | null {
  const raw = phone?.trim()
  // "-" or "n/a" stand for no number at all.
  if (!raw || !/\d/.test(raw)) return null
  const digits = normalizePhone(raw)
  return digits ? { text: formatPhone(digits), readable: true } : { text: raw, readable: false }
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

export type NextStep = { text: string; tone: "overdue" | "today" | "plain" | "quiet" }

// The one line that tells a salesperson what this lead needs. A follow-up
// counts only while the lead is open, the same rule as the Overview's
// "follow-ups due"; otherwise the line says how long it has sat in its status.
export function nextStep(lead: {
  status: string | null
  status_started_at: string | null
  follow_up_date: string | null
}): NextStep {
  const open = lead.status !== "Deal" && lead.status !== "No Deal"
  const next = open ? followUp(lead.follow_up_date) : null
  if (next?.overdue) return { text: `Follow-up was due ${next.label}`, tone: "overdue" }
  if (next?.due) return { text: "Follow up today", tone: "today" }
  if (next) return { text: `Follow up ${next.label}`, tone: "plain" }
  if (!lead.status) return { text: "No follow-up set", tone: "quiet" }
  const days = daysInStatus(lead.status_started_at)
  if (days === null) return { text: "Status date unknown", tone: "quiet" }
  const short = isLeadStatus(lead.status) ? LEAD_STATUS_SHORT[lead.status] : lead.status
  return { text: `In ${short} for ${dayCount(days)}`, tone: "plain" }
}
