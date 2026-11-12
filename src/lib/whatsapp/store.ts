import type { Json } from "./database.types"
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
  phone: string
  status: string
  statusStartedAt: string
  notes: string
}

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
  latestInboundMessageId(conversationId: string): Promise<string | null>

  findLeadsByPhoneWa(phoneWa: string): Promise<LeadRef[]>
  getLead(id: number): Promise<LeadRef | null>
  createLead(input: NewLead): Promise<LeadRef>
  // Compare-and-set: only writes when the status is still `expected`. Returns false otherwise.
  updateLeadStatus(id: number, expected: string | null, to: string, at: string): Promise<boolean>

  getQualification(conversationId: string): Promise<Qualification | null>
  saveQualification(conversationId: string, leadId: number | null, answers: JsonObject): Promise<void>

  logEvent(event: NewEvent): Promise<void>
  // The status the automation last set on this lead, from the event log.
  lastAutomatedStatus(leadId: number): Promise<string | null>
  hasOpenEvent(conversationId: string, type: NewEvent["type"]): Promise<boolean>

  recordAssignment(input: NewAssignment): Promise<void>
}

// Logging must never take the caller down with it.
export async function safeLog(store: WaStore, event: NewEvent) {
  try {
    await store.logEvent(event)
  } catch (error) {
    console.error("automation_events insert failed", event.type, error)
  }
}
