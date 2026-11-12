import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import type { JsonObject, WaStore } from "./store"
import type { LeadRef } from "./types"

const LEAD_COLUMNS = "id, customer_name, phone, phone_wa, status, sales_id"
const UNIQUE_VIOLATION = "23505"

function check(error: PostgrestError | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`)
}

// WaStore on Supabase. Give it the admin client in the webhook (no user, RLS
// bypassed) or the signed-in user's client in inbox actions (RLS applies).
export function createSupabaseStore(db: SupabaseClient<Database>): WaStore {
  return {
    async getConversation(id) {
      const { data, error } = await db.from("wa_conversations").select("*").eq("id", id).maybeSingle()
      check(error, "Read conversation")
      return data
    },

    async getConversationByWaId(waId) {
      const { data, error } = await db.from("wa_conversations").select("*").eq("wa_id", waId).maybeSingle()
      check(error, "Read conversation")
      return data
    },

    async createConversation(input) {
      const { data, error } = await db
        .from("wa_conversations")
        .insert({
          wa_id: input.waId,
          profile_name: input.profileName,
          phone_number_id: input.phoneNumberId,
          lead_id: input.leadId,
          assigned_sales_id: input.assignedSalesId,
        })
        .select("*")
        .single()

      // Two first messages can race; the loser reads the winner's row.
      if (error?.code === UNIQUE_VIOLATION) {
        const existing = await this.getConversationByWaId(input.waId)
        if (existing) return existing
      }
      check(error, "Create conversation")
      return data!
    },

    async updateConversation(id, patch) {
      const { error } = await db.from("wa_conversations").update(patch).eq("id", id)
      check(error, "Update conversation")
    },

    async insertMessage(input) {
      const { data, error } = await db
        .from("wa_messages")
        .insert({
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
        })
        .select("*")
        .single()

      if (error?.code === UNIQUE_VIOLATION) return null
      check(error, "Store message")
      return data
    },

    async listMessages(conversationId, limit) {
      const { data, error } = await db
        .from("wa_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit)
      check(error, "Read messages")
      return (data ?? []).reverse()
    },

    async getMessageByWaId(waMessageId) {
      const { data, error } = await db
        .from("wa_messages")
        .select("*")
        .eq("wa_message_id", waMessageId)
        .maybeSingle()
      check(error, "Read message")
      return data
    },

    async updateMessageStatus(waMessageId, patch) {
      const { error } = await db
        .from("wa_messages")
        .update({
          status: patch.status,
          ...(patch.errorCode !== undefined ? { error_code: patch.errorCode } : {}),
          ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
        })
        .eq("wa_message_id", waMessageId)
      check(error, "Update message status")
    },

    async latestInboundMessageId(conversationId) {
      const { data, error } = await db
        .from("wa_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      check(error, "Read latest message")
      return data?.id ?? null
    },

    async findLeadsByPhoneWa(phoneWa) {
      const { data, error } = await db.from("leads").select(LEAD_COLUMNS).eq("phone_wa", phoneWa).order("id")
      check(error, "Find leads by phone")
      return (data ?? []) as LeadRef[]
    },

    async getLead(id) {
      const { data, error } = await db.from("leads").select(LEAD_COLUMNS).eq("id", id).maybeSingle()
      check(error, "Read lead")
      return data as LeadRef | null
    },

    async createLead(input) {
      // phone_wa is filled by the leads_set_phone_wa trigger.
      const { data, error } = await db
        .from("leads")
        .insert({
          customer_name: input.customerName,
          phone: input.phone,
          status: input.status,
          status_started_at: input.statusStartedAt,
          notes: input.notes,
        })
        .select(LEAD_COLUMNS)
        .single()
      check(error, "Create lead")
      return data as LeadRef
    },

    async updateLeadStatus(id, expected, to, at) {
      const query = db.from("leads").update({ status: to, status_started_at: at }).eq("id", id)
      const { data, error } = await (expected === null ? query.is("status", null) : query.eq("status", expected)).select(
        "id",
      )
      check(error, "Update lead status")
      return (data ?? []).length === 1
    },

    async getQualification(conversationId) {
      const { data, error } = await db
        .from("wa_qualifications")
        .select("*")
        .eq("conversation_id", conversationId)
        .maybeSingle()
      check(error, "Read qualification")
      return data
    },

    async saveQualification(conversationId, leadId, answers) {
      const { error } = await db
        .from("wa_qualifications")
        .upsert({ conversation_id: conversationId, lead_id: leadId, answers }, { onConflict: "conversation_id" })
      check(error, "Save qualification")
    },

    async logEvent(event) {
      const { error } = await db.from("automation_events").insert({
        type: event.type,
        summary: event.summary,
        conversation_id: event.conversationId ?? null,
        lead_id: event.leadId ?? null,
        severity: event.severity ?? "info",
        needs_review: event.needsReview ?? false,
        detail: (event.detail ?? {}) as JsonObject,
        actor_sales_id: event.actorSalesId ?? null,
      })
      check(error, "Log event")
    },

    async lastAutomatedStatus(leadId) {
      const { data, error } = await db
        .from("automation_events")
        .select("detail")
        .eq("lead_id", leadId)
        .in("type", ["status_changed", "lead_created"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      check(error, "Read status history")
      const to = (data?.detail as { to?: unknown } | null)?.to
      return typeof to === "string" ? to : null
    },

    async hasOpenEvent(conversationId, type) {
      const { data, error } = await db
        .from("automation_events")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("type", type)
        .is("resolved_at", null)
        .limit(1)
      check(error, "Read events")
      return (data ?? []).length > 0
    },

    async isSalesUserActive(salesId) {
      const { data, error } = await db.from("sales_users").select("status").eq("id", salesId).maybeSingle()
      check(error, "Read salesperson")
      return !!data && data.status !== "Inactive"
    },

    async recordAssignment(input) {
      const { error } = await db.from("assignment_history").insert({
        conversation_id: input.conversationId,
        lead_id: input.leadId,
        from_sales_id: input.fromSalesId,
        to_sales_id: input.toSalesId,
        rule: input.rule,
        assigned_by: input.assignedBy,
      })
      check(error, "Record assignment")
    },
  }
}
