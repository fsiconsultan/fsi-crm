import type { Tables } from "./database.types"

export type Conversation = Tables<"wa_conversations">
export type Message = Tables<"wa_messages">
export type Qualification = Tables<"wa_qualifications">
export type AutomationEvent = Tables<"automation_events">

export type ConversationMode = "bot" | "human"
export type MessageStatus = "received" | "sent" | "delivered" | "read" | "failed"
export type SenderType = "customer" | "bot" | "human"

// The slice of a lead the automation reads. It never needs the rest.
export type LeadRef = {
  id: number
  customer_name: string | null
  phone: string | null
  phone_wa: string | null
  status: string | null
  sales_id: string | null
}

// Event types written to automation_events. docs/whatsapp.md explains each.
export type EventType =
  | "lead_created"
  | "lead_linked"
  | "lead_match_ambiguous"
  | "status_changed"
  | "status_change_refused"
  | "status_change_failed"
  | "handoff_requested"
  | "takeover"
  | "handback"
  | "assigned"
  | "send_failed"
  | "reply_suppressed"
  | "ai_not_configured"
  | "ai_error"
  | "tool_failed"
  | "unsupported_message"
  | "webhook_error"

export type NewEvent = {
  type: EventType
  summary: string
  conversationId?: string | null
  leadId?: number | null
  severity?: "info" | "warning" | "error"
  needsReview?: boolean
  detail?: Record<string, unknown>
  actorSalesId?: string | null
}
