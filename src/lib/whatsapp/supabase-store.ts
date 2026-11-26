import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { HeldStatus, JsonObject, WaStore } from "./store"
import type { LeadRef } from "./types"

const LEAD_COLUMNS = "id, customer_name, phone, phone_wa, status, status_started_at, sales_id"
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

    async updateMessage(id, patch) {
      const { error } = await db
        .from("wa_messages")
        .update({
          wa_message_id: patch.waMessageId,
          status: patch.status,
          error_code: patch.errorCode,
          error_message: patch.errorMessage,
        })
        .eq("id", id)
      check(error, "Update message")
    },

    async hasOutboundAfter(conversationId, createdAt) {
      const { data, error } = await db
        .from("wa_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("direction", "outbound")
        .gt("created_at", createdAt)
        .limit(1)
      check(error, "Read replies")
      return (data ?? []).length > 0
    },

    async holdStatus(update) {
      const { error } = await db.from("wa_status_backlog").upsert(
        {
          wa_message_id: update.waMessageId,
          status: update.status,
          error_code: update.errorCode,
          error_message: update.errorMessage,
        },
        { onConflict: "wa_message_id" },
      )
      check(error, "Hold delivery status")
    },

    async takeHeldStatus(waMessageId) {
      const { data, error } = await db.from("wa_status_backlog").delete().eq("wa_message_id", waMessageId).select("*")
      check(error, "Read held delivery status")
      const row = data?.[0]
      return row
        ? {
            waMessageId: row.wa_message_id,
            status: row.status as HeldStatus["status"],
            errorCode: row.error_code,
            errorMessage: row.error_message,
          }
        : null
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

    async findOrCreateLead(conversationId, input) {
      const { data, error } = await db.rpc("wa_find_or_create_lead", {
        p_conversation_id: conversationId,
        p_customer_name: input.customerName ?? "",
        p_status: input.status,
        p_status_started_at: input.statusStartedAt,
        p_notes: input.notes,
      })
      check(error, "Find or create lead")
      const result = data as { kind: string; lead_id?: number; lead_ids?: number[] }
      if (result.kind === "ambiguous") return { kind: "ambiguous", leadIds: result.lead_ids ?? [] }
      return { kind: result.kind as "existing" | "linked" | "created", leadId: Number(result.lead_id) }
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
      // Only server-written rows (no actor): staff cannot forge what the automation did.
      const { data, error } = await db
        .from("automation_events")
        .select("detail")
        .eq("lead_id", leadId)
        .is("actor_sales_id", null)
        .in("type", ["status_changed", "lead_created"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      check(error, "Read status history")
      const detail = data?.detail as { to?: unknown; at?: unknown } | null
      if (typeof detail?.to !== "string") return null
      return { status: detail.to, at: typeof detail.at === "string" ? detail.at : null }
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

    async claimAiRun(conversationId, runId, staleBefore) {
      const { data, error } = await db
        .from("wa_conversations")
        .update({ ai_run_id: runId, ai_run_at: new Date().toISOString() })
        .eq("id", conversationId)
        .or(`ai_run_id.is.null,ai_run_at.lt.${staleBefore}`)
        .select("id")
      check(error, "Claim AI run")
      return (data ?? []).length === 1
    },

    async confirmAiSend(conversationId, runId, afterOwnHandoff) {
      const query = db
        .from("wa_conversations")
        .update({ ai_run_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("ai_run_id", runId)
      // Bot mode, or the AI's own handoff that nobody has claimed yet.
      const guarded = afterOwnHandoff ? query.eq("mode", "human").is("taken_over_by", null) : query.eq("mode", "bot")
      const { data, error } = await guarded.select("id")
      check(error, "Confirm AI send")
      return (data ?? []).length === 1
    },

    async releaseAiRun(conversationId, runId, clearPending) {
      const { error } = await db
        .from("wa_conversations")
        .update({ ai_run_id: null, ai_run_at: null, ...(clearPending ? { ai_pending_since: null } : {}) })
        .eq("id", conversationId)
        .eq("ai_run_id", runId)
      check(error, "Release AI run")
    },
  }
}
