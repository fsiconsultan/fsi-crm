import type { Json } from "@/lib/supabase/database.types"
import type { Conversation, LeadRef, Message, MessageStatus, NewEvent, Qualification, SenderType } from "./types"

export type JsonObject = { [key: string]: Json | undefined }

export type NewConversation = {
  waId: string
  profileName: string | null
  phoneNumberId: string | null
  leadId: number | null
  assignedSalesId: string | null
}

export type ConversationPatch = Partial<
  Pick<
    Conversation,
    | "profile_name"
    | "lead_id"
    | "mode"
    | "assigned_sales_id"
    | "taken_over_by"
    | "taken_over_at"
    | "handed_back_at"
    | "last_inbound_at"
    | "last_message_at"
    | "last_message_preview"
    | "last_read_at"
    | "ai_pending_since"
  >
>

export type NewMessage = {
  conversationId: string
  direction: "inbound" | "outbound"
  senderType: SenderType
  senderSalesId?: string | null
  messageType?: string
  body: string | null
  waMessageId: string | null
  status: MessageStatus
  errorCode?: string | null
  errorMessage?: string | null
  waTimestamp?: string | null
}

export type NewLead = {
  customerName: string | null
  status: string
  statusStartedAt: string
  notes: string
}

export type LeadLink =
  | { kind: "existing" | "linked" | "created"; leadId: number }
  | { kind: "ambiguous"; leadIds: number[] }

export type HeldStatus = {
  waMessageId: string
  status: MessageStatus
  errorCode: string | null
  errorMessage: string | null
}

// What the automation last wrote to a lead's status, and when.
export type AutomatedStatus = { status: string; at: string | null }

export type NewAssignment = {
  conversationId: string | null
  leadId: number | null
  fromSalesId: string | null
  toSalesId: string | null
  rule: string
  assignedBy: string | null
}

// Everything the webhook, the agent and the inbox actions need from the
// database. The Supabase implementation is in supabase-store.ts; tests use the
// in-memory one in testing/memory-store.ts. Methods throw on a database error.
export interface WaStore {
  getConversation(id: string): Promise<Conversation | null>
  getConversationByWaId(waId: string): Promise<Conversation | null>
  createConversation(input: NewConversation): Promise<Conversation>
  updateConversation(id: string, patch: ConversationPatch): Promise<void>

  // Returns null when a message with the same Meta id is already stored.
  insertMessage(input: NewMessage): Promise<Message | null>
  listMessages(conversationId: string, limit: number): Promise<Message[]>
  getMessageByWaId(waMessageId: string): Promise<Message | null>
  updateMessageStatus(
    waMessageId: string,
    patch: { status: MessageStatus; errorCode?: string | null; errorMessage?: string | null },
  ): Promise<void>
  // Fills in a message stored as "pending" before it was sent.
  updateMessage(
    id: string,
    patch: { waMessageId: string | null; status: MessageStatus; errorCode: string | null; errorMessage: string | null },
  ): Promise<void>
  latestInboundMessageId(conversationId: string): Promise<string | null>
  hasOutboundAfter(conversationId: string, createdAt: string): Promise<boolean>

  // A delivery update for a message whose Meta id is not stored yet.
  holdStatus(update: HeldStatus): Promise<void>
  takeHeldStatus(waMessageId: string): Promise<HeldStatus | null>

  findLeadsByPhoneWa(phoneWa: string): Promise<LeadRef[]>
  getLead(id: number): Promise<LeadRef | null>
  // Links the conversation to its lead, creating one if the number is new, in
  // one locked step so overlapping runs cannot create two leads.
  findOrCreateLead(conversationId: string, input: NewLead): Promise<LeadLink>
  // Compare-and-set: only writes when the status is still `expected`. Returns false otherwise.
  updateLeadStatus(id: number, expected: string | null, to: string, at: string): Promise<boolean>

  getQualification(conversationId: string): Promise<Qualification | null>
  saveQualification(conversationId: string, leadId: number | null, answers: JsonObject): Promise<void>

  logEvent(event: NewEvent): Promise<void>
  // The status the automation last set on this lead, from server-written events only.
  lastAutomatedStatus(leadId: number): Promise<AutomatedStatus | null>
  hasOpenEvent(conversationId: string, type: NewEvent["type"]): Promise<boolean>

  recordAssignment(input: NewAssignment): Promise<void>
  // False when the salesperson is Inactive (or does not exist).
  isSalesUserActive(salesId: string): Promise<boolean>

  // One AI run at a time per conversation. claim succeeds when nobody holds it
  // or the holder started before staleBefore; confirmSend re-checks right before
  // sending that this run still holds it and nobody took over.
  claimAiRun(conversationId: string, runId: string, staleBefore: string): Promise<boolean>
  confirmAiSend(conversationId: string, runId: string, afterOwnHandoff: boolean): Promise<boolean>
  releaseAiRun(conversationId: string, runId: string, clearPending: boolean): Promise<void>
}

// Logging must never take the caller down with it.
export async function safeLog(store: WaStore, event: NewEvent) {
  try {
    await store.logEvent(event)
  } catch (error) {
    console.error("automation_events insert failed", event.type, error)
  }
}
