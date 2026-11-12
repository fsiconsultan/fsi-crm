import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { createSupabaseStore } from "@/lib/whatsapp/supabase-store"
import { safeLog } from "@/lib/whatsapp/store"
import { createNotifier, type Notifier } from "./notify"
import { webPushSenderFromEnv } from "./sender"
import { createSupabasePushStore } from "./supabase-push-store"

// Null until the VAPID env vars are set. `admin` must be the secret-key client:
// it reads other users' devices.
export function notifierFromEnv(admin: SupabaseClient<Database>): Notifier | null {
  const sender = webPushSenderFromEnv()
  if (!sender) return null
  const events = createSupabaseStore(admin)
  return createNotifier({
    store: createSupabasePushStore(admin),
    sender,
    log: (event) => safeLog(events, event),
    now: () => new Date(),
  })
}
