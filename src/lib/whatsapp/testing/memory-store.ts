import { normalizePhone } from "@/lib/phone"
import type { WaStore } from "../store"
import type { AutomationEvent, Conversation, LeadRef, Message, Qualification } from "../types"

// In-memory WaStore for tests. It keeps the same guarantees the database gives:
// unique wa_id, unique wa_message_id, compare-and-set on lead status. Reads
// return copies, as a database does, so callers cannot see later writes.
export function createMemoryStore(seed: { leads?: LeadRef[]; inactiveSales?: string[] } = {}) {
  const conversations: Conversation[] = []
  const messages: Message[] = []
  const leads: LeadRef[] = [...(seed.leads ?? [])]
  const qualifications: Qualification[] = []
  const events: AutomationEvent[] = []
  const assignments: Array<Record<string, unknown>> = []
  let tick = 0
  const stamp = () => new Date(Date.UTC(2026, 10, 12, 0, 0, tick++)).toISOString()
  const id = (prefix: string) => `${prefix}-${++tick}`

  const store: WaStore = {
    async getConversation(cid) {
      const found = conversations.find((c) => c.id === cid)
      return found ? { ...found } : null
    },
    async getConversationByWaId(waId) {
      const found = conversations.find((c) => c.wa_id === waId)
      return found ? { ...found } : null
    },
    async createConversation(input) {
      const existing = conversations.find((c) => c.wa_id === input.waId)
      if (existing) return { ...existing }
      const now = stamp()
      const conversation: Conversation = {
        id: id("conv"),
        wa_id: input.waId,
        profile_name: input.profileName,
        phone_number_id: input.phoneNumberId,
        lead_id: input.leadId,
        source: "whatsapp",
        mode: "bot",
        assigned_sales_id: input.assignedSalesId,
        taken_over_by: null,
        taken_over_at: null,
        handed_back_at: null,
        last_inbound_at: null,
        last_message_at: null,
        last_message_preview: null,
        last_read_at: null,
        created_at: now,
        updated_at: now,
      }
      conversations.push(conversation)
      return { ...conversation }
    },
    async updateConversation(cid, patch) {
      const conversation = conversations.find((c) => c.id === cid)
      if (!conversation) throw new Error("Update conversation: not found")
      Object.assign(conversation, patch, { updated_at: stamp() })
    },
    async insertMessage(input) {
      if (input.waMessageId && messages.some((m) => m.wa_message_id === input.waMessageId)) return null
      const message: Message = {
        id: id("msg"),
        conversation_id: input.conversationId,
        direction: input.direction,
        sender_type: input.senderType,
        sender_sales_id: input.senderSalesId ?? null,
        message_type: input.messageType ?? "text",
        body: input.body,
        wa_message_id: input.waMessageId,
        status: input.status,
        error_code: input.errorCode ?? null,
        error_message: input.errorMessage ?? null,
        wa_timestamp: input.waTimestamp ?? null,
        created_at: stamp(),
      }
      messages.push(message)
      return { ...message }
    },
    async listMessages(conversationId, limit) {
      return messages.filter((m) => m.conversation_id === conversationId).slice(-limit).map((m) => ({ ...m }))
    },
    async getMessageByWaId(waMessageId) {
      const found = messages.find((m) => m.wa_message_id === waMessageId)
      return found ? { ...found } : null
    },
    async updateMessageStatus(waMessageId, patch) {
      const message = messages.find((m) => m.wa_message_id === waMessageId)
      if (!message) return
      message.status = patch.status
      if (patch.errorCode !== undefined) message.error_code = patch.errorCode
      if (patch.errorMessage !== undefined) message.error_message = patch.errorMessage
    },
    async latestInboundMessageId(conversationId) {
      const inbound = messages.filter((m) => m.conversation_id === conversationId && m.direction === "inbound")
      return inbound.at(-1)?.id ?? null
    },
    async findLeadsByPhoneWa(phoneWa) {
      return leads.filter((l) => l.phone_wa === phoneWa).map((l) => ({ ...l }))
    },
    async getLead(leadId) {
      const lead = leads.find((l) => l.id === leadId)
      return lead ? { ...lead } : null
    },
    async createLead(input) {
      const lead: LeadRef = {
        id: Math.max(0, ...leads.map((l) => l.id)) + 1,
        customer_name: input.customerName,
        phone: input.phone,
        phone_wa: normalizePhone(input.phone),
        status: input.status,
        sales_id: null,
      }
      leads.push(lead)
      return { ...lead }
    },
    async updateLeadStatus(leadId, expected, to) {
      const lead = leads.find((l) => l.id === leadId)
      if (!lead || lead.status !== expected) return false
      lead.status = to
      return true
    },
    async getQualification(conversationId) {
      return qualifications.find((q) => q.conversation_id === conversationId) ?? null
    },
    async saveQualification(conversationId, leadId, answers) {
      const existing = qualifications.find((q) => q.conversation_id === conversationId)
      if (existing) Object.assign(existing, { lead_id: leadId, answers, updated_at: stamp() })
      else {
        const now = stamp()
        qualifications.push({ conversation_id: conversationId, lead_id: leadId, answers, created_at: now, updated_at: now })
      }
    },
    async logEvent(event) {
      events.push({
        id: id("evt"),
        type: event.type,
        summary: event.summary,
        conversation_id: event.conversationId ?? null,
        lead_id: event.leadId ?? null,
        severity: event.severity ?? "info",
        needs_review: event.needsReview ?? false,
        detail: (event.detail ?? {}) as AutomationEvent["detail"],
        actor_sales_id: event.actorSalesId ?? null,
        created_at: stamp(),
        resolved_at: null,
        resolved_by: null,
      })
    },
    async lastAutomatedStatus(leadId) {
      const last = events
        .filter((e) => e.lead_id === leadId && (e.type === "status_changed" || e.type === "lead_created"))
        .at(-1)
      const to = (last?.detail as { to?: unknown } | undefined)?.to
      return typeof to === "string" ? to : null
    },
    async hasOpenEvent(conversationId, type) {
      return events.some((e) => e.conversation_id === conversationId && e.type === type && !e.resolved_at)
    },
    async isSalesUserActive(salesId) {
      return !seed.inactiveSales?.includes(salesId)
    },
    async recordAssignment(input) {
      assignments.push(input)
    },
  }

  return { store, conversations, messages, leads, qualifications, events, assignments }
}
