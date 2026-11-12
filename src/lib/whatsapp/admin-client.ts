import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Server-side client for the webhook and the agent. It uses the secret key, so
// it bypasses RLS: Meta's servers are not a signed-in user. Import it only from
// the webhook route. Never import it into a component or a server action that a
// signed-in user triggers; those use src/lib/supabase/server.ts so RLS applies.
export function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
