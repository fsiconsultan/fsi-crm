import { CalendarClock, CalendarDays, MapPin, Phone, type LucideIcon } from "lucide-react"
import type { ScheduleKind } from "@/lib/schedules/types"
import type { Dot, ItemState } from "./model"

// A calendar for a meeting, a map pin for a visit to the site, a phone for a
// call, a calendar clock for a date to call back. Same glyphs as the Overview.
export const KIND_ICON: Record<ScheduleKind, LucideIcon> = {
  appointment: CalendarDays,
  site_survey: MapPin,
  call: Phone,
  follow_up: CalendarClock,
}

// Calendar dots reuse existing tokens (no new colors): blue appointment, the
// First meeting teal for a site survey, the First contact indigo for a call,
// amber for a follow-up, pink for anything overdue. The list always names the
// kind in text, so color is never the only signal.
export const DOT_TONE: Record<Dot, string> = {
  appointment: "bg-accent",
  site_survey: "bg-[var(--st-first-meeting)]",
  call: "bg-[var(--st-first-contact)]",
  follow_up: "bg-warning",
  overdue: "bg-negative",
}

const PILL_TONE: Record<ItemState, string> = {
  scheduled: "bg-accent-soft text-ink",
  overdue: "bg-negative-soft text-ink",
  done: "bg-positive-soft text-ink",
  cancelled: "bg-surface-sunken text-muted",
}

const PILL_LABEL: Record<ItemState, string> = {
  scheduled: "Scheduled",
  overdue: "Overdue",
  done: "Done",
  cancelled: "Cancelled",
}

/** Read-only status pill; ink text on a tint, as the lead status pill (AA at 12px). */
export function StatePill({ state }: { state: ItemState }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL_TONE[state]}`}>
      {PILL_LABEL[state]}
    </span>
  )
}

export function KindDot({ dot, className = "size-1.5" }: { dot: Dot; className?: string }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-full ${DOT_TONE[dot]} ${className}`} />
}

type TagSize = "full" | "compact"

const TAG_SIZE: Record<TagSize, string> = {
  full: "px-2 py-0.5 text-xs",
  compact: "px-1.5 text-[11px] leading-4",
}

const TAG_TONE = {
  ai: "border border-line bg-surface text-ink",
  confirm: "bg-warning-soft text-ink",
} as const

const TAG_TEXT: Record<TagSize, { ai: string; confirm: string }> = {
  full: { ai: "Booked by AI", confirm: "To confirm" },
  compact: { ai: "AI", confirm: "Confirm" },
}

function Tag({ tone, size, text, spoken }: { tone: keyof typeof TAG_TONE; size: TagSize; text: string; spoken: string }) {
  return (
    <span
      title={spoken}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ${TAG_TONE[tone]} ${TAG_SIZE[size]}`}
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  )
}

/**
 * "Booked by AI" on what the WhatsApp assistant booked, plus "To confirm"
 * (amber tint, ink text) until a person has confirmed it with the customer.
 * Neutral like the inbox's "AI" chip. The month board's narrow cells use the
 * short words, with the full ones for screen readers and on hover.
 */
export function AiTags({ booking, size = "full" }: { booking: "none" | "booked" | "toConfirm"; size?: TagSize }) {
  if (booking === "none") return null
  const text = TAG_TEXT[size]
  return (
    <>
      <Tag tone="ai" size={size} text={text.ai} spoken="Booked by AI" />
      {booking === "toConfirm" ? <Tag tone="confirm" size={size} text={text.confirm} spoken="To confirm with the customer" /> : null}
    </>
  )
}
