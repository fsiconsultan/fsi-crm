import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Server-side client for the webhook and the agent. It uses the secret key, so
// it bypasses RLS: Meta's servers are not a signed-in user. Used by the webhook
// route, and by the inbox assign action only inside after() to read the new
// assignee's devices for a notification. Never import it into a component, and
// never use it for data a signed-in user reads or writes: that goes through
// src/lib/supabase/server.ts so RLS applies.
export function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
