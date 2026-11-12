import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/whatsapp/database.types"
import type { PushStore } from "./types"

// Needs the admin client: it reads other users' devices to notify them.
export function createSupabasePushStore(db: SupabaseClient<Database>): PushStore {
  return {
    async subscriptionsFor(salesUserIds) {
      if (salesUserIds.length === 0) return []
      const { data, error } = await db
        .from("push_subscriptions")
        .select("id, sales_user_id, endpoint, p256dh, auth")
        .in("sales_user_id", salesUserIds)
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

    async markSuccess(id, at) {
      await db.from("push_subscriptions").update({ last_success_at: at, failure_count: 0 }).eq("id", id)
    },

    async recordFailure(id) {
      const { data } = await db.from("push_subscriptions").select("failure_count").eq("id", id).maybeSingle()
      if (data) await db.from("push_subscriptions").update({ failure_count: data.failure_count + 1 }).eq("id", id)
    },

    async remove(id) {
      await db.from("push_subscriptions").delete().eq("id", id)
    },
  }
}
