import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { PushStore } from "./types"

// Needs the admin client: it reads other users' devices to notify them.
export function createSupabasePushStore(db: SupabaseClient<Database>): PushStore {
  return {
    async subscriptionsFor(salesUserIds) {
      if (salesUserIds.length === 0) return []
      // Deactivated staff are never notified, even if their phone is still subscribed.
      const people = await db.from("sales_users").select("id, status").in("id", salesUserIds)
      if (people.error) throw new Error(`Read staff status: ${people.error.message}`)
      const active = (people.data ?? []).filter((row) => row.status !== "Inactive").map((row) => row.id)
      if (active.length === 0) return []

      const { data, error } = await db
        .from("push_subscriptions")
        .select("id, sales_user_id, endpoint, p256dh, auth")
        .in("sales_user_id", active)
      if (error) throw new Error(`Read push subscriptions: ${error.message}`)
      return (data ?? []).map((row) => ({
        id: row.id,
        salesUserId: row.sales_user_id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      }))
    },

    async activeAdminIds() {
      const { data, error } = await db.from("sales_users").select("id, status").eq("role", "Admin")
      if (error) throw new Error(`Read admins: ${error.message}`)
      return (data ?? []).filter((row) => row.status !== "Inactive").map((row) => row.id)
    },

    async isActive(salesUserId) {
      const { data, error } = await db.from("sales_users").select("status").eq("id", salesUserId).maybeSingle()
      if (error) throw new Error(`Read staff status: ${error.message}`)
      return !!data && data.status !== "Inactive"
    },

    async markSuccess(id, at) {
      const { error } = await db.from("push_subscriptions").update({ last_success_at: at, failure_count: 0 }).eq("id", id)
      if (error) throw new Error(`Mark device delivered: ${error.message}`)
    },

    async recordFailure(id) {
      const { error } = await db.rpc("record_push_failure", { p_id: id })
      if (error) throw new Error(`Count device failure: ${error.message}`)
    },

    async remove(id) {
      const { error } = await db.from("push_subscriptions").delete().eq("id", id)
      if (error) throw new Error(`Remove expired device: ${error.message}`)
    },
  }
}
