import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, TablesUpdate } from "@/lib/supabase/database.types"
import type { ScheduleStore } from "./store"

const LEAD_COLUMNS = "id, customer_name, email, sales_id, appointment, site_survey, follow_up_date, location"

/**
 * The schedule store on a Supabase client. Staff actions pass the signed-in
 * user's client, so RLS decides which leads and schedules they reach. The
 * WhatsApp assistant passes the secret-key client.
 */
export function supabaseScheduleStore(db: SupabaseClient<Database>): ScheduleStore {
  const fail = (what: string, message: string): never => {
    throw new Error(`${what}: ${message}`)
  }

  return {
    async getLead(id) {
      const { data, error } = await db.from("leads").select(LEAD_COLUMNS).eq("id", id).maybeSingle()
      if (error) fail("The lead could not be loaded", error.message)
      return data ?? null
    },

    async salesName(id) {
      const { data, error } = await db.from("sales_users").select("name, username").eq("id", id).maybeSingle()
      if (error) return null
      return data?.name ?? data?.username ?? null
    },

    async insert(row) {
      const { data, error } = await db.from("lead_schedules").insert(row).select("*").single()
      if (error || !data) return fail("The schedule could not be saved", error?.message ?? "no row returned")
      return data
    },

    async get(id) {
      const { data, error } = await db.from("lead_schedules").select("*").eq("id", id).maybeSingle()
      if (error) fail("The schedule could not be loaded", error.message)
      return data ?? null
    },

    async updateIfUnchanged(id, updatedAt, patch) {
      const { data, error } = await db
        .from("lead_schedules")
        .update(patch)
        .eq("id", id)
        .eq("updated_at", updatedAt)
        .select("*")
      if (error) fail("The schedule could not be saved", error.message)
      return data?.[0] ?? null
    },

    async update(id, patch) {
      const { data, error } = await db.from("lead_schedules").update(patch).eq("id", id).select("*").single()
      if (error || !data) return fail("The schedule could not be updated", error?.message ?? "no row returned")
      return data
    },

    async listForLead(leadId, kinds) {
      const { data, error } = await db
        .from("lead_schedules")
        .select("*")
        .eq("lead_id", leadId)
        .in("kind", kinds)
        .order("starts_at", { ascending: true })
        .limit(500)
      if (error) fail("The lead's schedules could not be loaded", error.message)
      return data ?? []
    },

    async listScheduledBetween(fromIso, toIso) {
      // Overlap: starts before the window ends, and ends (or, with no end, starts) after it begins.
      const { data, error } = await db
        .from("lead_schedules")
        .select("*")
        .eq("status", "scheduled")
        .lt("starts_at", toIso)
        .or(`ends_at.gt.${fromIso},and(ends_at.is.null,starts_at.gte.${fromIso})`)
        .order("starts_at", { ascending: true })
        .limit(1000)
      if (error) fail("The calendar could not be loaded", error.message)
      return data ?? []
    },

    async setLeadDate(leadId, column, value, updatedBy) {
      const patch: TablesUpdate<"leads"> = { [column]: value }
      if (updatedBy) patch.updated_by = updatedBy
      const { data, error } = await db.from("leads").update(patch).eq("id", leadId).select("id")
      if (error) fail("The lead's date could not be updated", error.message)
      if (!data?.length) fail("The lead's date could not be updated", "permission denied")
    },

    async logEvent(event) {
      const { error } = await db.from("automation_events").insert({
        type: event.type,
        lead_id: event.leadId,
        actor_sales_id: event.actorSalesId,
        conversation_id: event.conversationId ?? null,
        severity: event.severity ?? "error",
        needs_review: event.needsReview ?? true,
        summary: event.summary,
        detail: { schedule_id: event.scheduleId, ...event.detail },
      })
      if (error) fail("The failure could not be logged", error.message)
    },
  }
}
