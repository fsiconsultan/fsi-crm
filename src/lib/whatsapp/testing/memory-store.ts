import { normalizePhone } from "@/lib/phone"
import type { HeldStatus, WaStore } from "../store"
import type { AutomationEvent, Conversation, LeadRef, Message, Qualification } from "../types"

// In-memory WaStore for tests. It keeps the same guarantees the database gives:
// unique wa_id, unique wa_message_id, compare-and-set on lead status. Reads
// return copies, as a database does, so callers cannot see later writes.
type SeedLead = Omit<LeadRef, "status_started_at"> & { status_started_at?: string | null }

export function createMemoryStore(seed: { leads?: SeedLead[]; inactiveSales?: string[] } = {}) {
  const conversations: Conversation[] = []
  const messages: Message[] = []
  const leads: LeadRef[] = (seed.leads ?? []).map((lead) => ({ status_started_at: null, ...lead }))
  const held: HeldStatus[] = []
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
        ai_run_id: null,
        ai_run_at: null,
        ai_pending_since: null,
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
    async updateMessage(messageId, patch) {
      const message = messages.find((m) => m.id === messageId)
      if (!message) throw new Error("Update message: not found")
      if (patch.waMessageId && messages.some((m) => m.wa_message_id === patch.waMessageId && m.id !== messageId)) {
        throw new Error("Update message: duplicate wa_message_id")
      }
      Object.assign(message, {
        wa_message_id: patch.waMessageId,
        status: patch.status,
        error_code: patch.errorCode,
        error_message: patch.errorMessage,
      })
    },
    async hasOutboundAfter(conversationId, createdAt) {
      return messages.some((m) => m.conversation_id === conversationId && m.direction === "outbound" && m.created_at > createdAt)
    },
    async holdStatus(update) {
      const i = held.findIndex((h) => h.waMessageId === update.waMessageId)
      if (i >= 0) held.splice(i, 1)
      held.push({ ...update })
    },
    async takeHeldStatus(waMessageId) {
      const i = held.findIndex((h) => h.waMessageId === waMessageId)
      return i >= 0 ? held.splice(i, 1)[0] : null
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
    async findOrCreateLead(conversationId, input) {
      // Synchronous from here on, so it is atomic like the locked SQL function.
      const conversation = conversations.find((c) => c.id === conversationId)
      if (!conversation) throw new Error("Find or create lead: conversation not found")
      if (conversation.lead_id !== null) return { kind: "existing", leadId: conversation.lead_id }
      const matches = leads.filter((l) => l.phone_wa === conversation.wa_id)
      if (matches.length > 1) return { kind: "ambiguous", leadIds: matches.map((l) => l.id) }
      if (matches.length === 1) {
        conversation.lead_id = matches[0].id
        return { kind: "linked", leadId: matches[0].id }
      }
      const lead: LeadRef = {
        id: Math.max(0, ...leads.map((l) => l.id)) + 1,
        customer_name: input.customerName,
        phone: `+${conversation.wa_id}`,
        phone_wa: normalizePhone(`+${conversation.wa_id}`),
        status: input.status,
        status_started_at: input.statusStartedAt,
        sales_id: null,
      }
      leads.push(lead)
      conversation.lead_id = lead.id
      return { kind: "created", leadId: lead.id }
    },
    async updateLeadStatus(leadId, expected, to, at) {
      const lead = leads.find((l) => l.id === leadId)
      if (!lead || lead.status !== expected) return false
      lead.status = to
      lead.status_started_at = at
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
        .filter(
          (e) =>
            e.lead_id === leadId && e.actor_sales_id === null && (e.type === "status_changed" || e.type === "lead_created"),
        )
        .at(-1)
      const detail = last?.detail as { to?: unknown; at?: unknown } | undefined
      if (typeof detail?.to !== "string") return null
      return { status: detail.to, at: typeof detail.at === "string" ? detail.at : null }
    },
    async hasOpenEvent(conversationId, type) {
      return events.some((e) => e.conversation_id === conversationId && e.type === type && !e.resolved_at)
    },
    async claimAiRun(conversationId, runId, staleBefore) {
      const c = conversations.find((x) => x.id === conversationId)
      if (!c || (c.ai_run_id !== null && (c.ai_run_at ?? "") >= staleBefore)) return false
      c.ai_run_id = runId
      c.ai_run_at = new Date().toISOString()
      return true
    },
    async confirmAiSend(conversationId, runId, afterOwnHandoff) {
      const c = conversations.find((x) => x.id === conversationId)
      if (!c || c.ai_run_id !== runId) return false
      return afterOwnHandoff ? c.mode === "human" && c.taken_over_by === null : c.mode === "bot"
    },
    async releaseAiRun(conversationId, runId, clearPending) {
      const c = conversations.find((x) => x.id === conversationId)
      if (!c || c.ai_run_id !== runId) return
      c.ai_run_id = null
      c.ai_run_at = null
      if (clearPending) c.ai_pending_since = null
    },
    async isSalesUserActive(salesId) {
      return !seed.inactiveSales?.includes(salesId)
    },
    async recordAssignment(input) {
      assignments.push(input)
    },
  }

  return { store, conversations, messages, leads, qualifications, events, assignments, held }
}
