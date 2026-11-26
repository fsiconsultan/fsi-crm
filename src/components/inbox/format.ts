import { formatPhone } from "@/lib/phone"
import type { ConversationSummary } from "@/lib/whatsapp/inbox"

// Bali time with a fixed locale, so the server render never depends on the host.
const ZONE = "Asia/Makassar"
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short" })
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE })
const FULL = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

export function formatDateTime(iso: string) {
  return FULL.format(new Date(iso))
}

// Time today, day and month otherwise.
export function formatShortTime(iso: string, now: Date) {
  const date = new Date(iso)
  return DAY_KEY.format(date) === DAY_KEY.format(now) ? TIME.format(date) : DAY.format(date)
}

// "now", "5 min ago", "3 h ago", "2 d ago", then the day and month.
export function formatRelative(iso: string, now: Date) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))} d ago`
  return DAY.format(new Date(iso))
}

export function displayName(conversation: Pick<ConversationSummary, "lead" | "profile_name" | "wa_id">) {
  return conversation.lead?.customer_name ?? conversation.profile_name ?? formatPhone(conversation.wa_id)
}

export function assigneeLabel(conversation: Pick<ConversationSummary, "assignee" | "assigned_sales_id">) {
  if (!conversation.assigned_sales_id) return "Unassigned"
  return conversation.assignee?.name ?? "Assigned"
}

export type ModeKind = "bot" | "staff" | "waiting"

// "waiting": the AI asked for a person and nobody has taken over yet.
export function modeKind(conversation: Pick<ConversationSummary, "mode" | "taken_over_by">): ModeKind {
  if (conversation.mode !== "human") return "bot"
  return conversation.taken_over_by ? "staff" : "waiting"
}

const WINDOW_HOURS = 24
const HOUR_MS = 60 * 60 * 1000

export type ReplyWindow = { usedHours: number; label: string }

// How much of WhatsApp's 24-hour reply window has passed since the customer last wrote.
export function replyWindow(lastInboundAt: string, now: Date): ReplyWindow {
  const elapsedMs = Math.max(0, now.getTime() - new Date(lastInboundAt).getTime())
  const leftMinutes = Math.floor((WINDOW_HOURS * HOUR_MS - elapsedMs) / 60000)
  if (leftMinutes <= 0) return { usedHours: WINDOW_HOURS, label: "Reply window closed" }
  return {
    usedHours: Math.round((elapsedMs / HOUR_MS) * 10) / 10,
    label: `Reply window: ${Math.floor(leftMinutes / 60)}h ${leftMinutes % 60}m left`,
  }
}
