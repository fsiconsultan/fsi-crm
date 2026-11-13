import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/whatsapp/admin-client"
import { redactSecrets } from "./env"

// What the database already knows about each connection: counts and the last
// time something happened. Read as the signed-in Admin, so RLS shows all rows.

export type Fact<T> = { state: "ready"; value: T } | { state: "not_set_up" } | { state: "error"; message: string }

export type LastEvent = { at: string; summary: string } | null

export type SettingsActivity = {
  leads: Fact<number>
  staff: Fact<number>
  lastInbound: Fact<string | null>
  lastWebhookProblem: Fact<LastEvent>
  lastAiReply: Fact<string | null>
  lastAiProblem: Fact<LastEvent>
  devices: Fact<{ count: number; scope: "everyone" | "you" }>
  lastCalendarSync: Fact<string | null>
  lastCalendarError: Fact<LastEvent>
  lastEmailSent: Fact<string | null>
  lastEmailError: Fact<LastEvent>
}

function failed<T>(error: PostgrestError): Fact<T> {
  // PGRST205 / 42P01: the table does not exist yet (migration not applied).
  if (error.code === "PGRST205" || error.code === "42P01") return { state: "not_set_up" }
  return { state: "error", message: redactSecrets(error.message) }
}

export async function loadSettingsActivity(): Promise<SettingsActivity> {
  const db = await createClient()
  const admin = createAdminClient()

  const [leads, staff, inbound, webhook, aiReply, aiProblem, devices, calendarSync, calendarError, emailSent, emailError] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }),
    db.from("sales_users").select("id", { count: "exact", head: true }),
    db.from("wa_messages").select("created_at").eq("direction", "inbound").order("created_at", { ascending: false }).limit(1),
    db
      .from("automation_events")
      .select("created_at, summary")
      .eq("type", "webhook_error")
      .order("created_at", { ascending: false })
      .limit(1),
    db.from("wa_messages").select("created_at").eq("sender_type", "bot").order("created_at", { ascending: false }).limit(1),
    db
      .from("automation_events")
      .select("created_at, summary")
      .in("type", ["ai_error", "ai_not_configured"])
      .order("created_at", { ascending: false })
      .limit(1),
    // RLS shows each user only their own devices; the secret key sees all.
    (admin ?? db).from("push_subscriptions").select("id", { count: "exact", head: true }),
    db
      .from("lead_schedules")
      .select("google_synced_at")
      .not("google_synced_at", "is", null)
      .order("google_synced_at", { ascending: false })
      .limit(1),
    db
      .from("lead_schedules")
      .select("updated_at, google_error")
      .eq("google_sync_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(1),
    db
      .from("lead_schedules")
      .select("email_sent_at")
      .not("email_sent_at", "is", null)
      .order("email_sent_at", { ascending: false })
      .limit(1),
    db
      .from("lead_schedules")
      .select("updated_at, email_error")
      .eq("email_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(1),
  ])

  const count = (result: { count: number | null; error: PostgrestError | null }): Fact<number> =>
    result.error ? failed(result.error) : { state: "ready", value: result.count ?? 0 }

  const latestAt = (result: { data: Array<{ created_at: string }> | null; error: PostgrestError | null }): Fact<string | null> =>
    result.error ? failed(result.error) : { state: "ready", value: result.data?.[0]?.created_at ?? null }

  const latestEvent = (result: {
    data: Array<{ created_at: string; summary: string }> | null
    error: PostgrestError | null
  }): Fact<LastEvent> => {
    if (result.error) return failed(result.error)
    const row = result.data?.[0]
    return { state: "ready", value: row ? { at: row.created_at, summary: redactSecrets(row.summary).slice(0, 240) } : null }
  }

  const deviceCount = count(devices)

  const latestValue = <K extends string>(
    result: { data: Array<Record<K, string | null>> | null; error: PostgrestError | null },
    key: K,
  ): Fact<string | null> => (result.error ? failed(result.error) : { state: "ready", value: result.data?.[0]?.[key] ?? null })

  const latestProblem = <K extends string>(
    result: { data: Array<{ updated_at: string } & Record<K, string | null>> | null; error: PostgrestError | null },
    key: K,
  ): Fact<LastEvent> => {
    if (result.error) return failed(result.error)
    const row = result.data?.[0]
    return {
      state: "ready",
      value: row ? { at: row.updated_at, summary: redactSecrets(row[key] ?? "No reason recorded").slice(0, 240) } : null,
    }
  }

  return {
    leads: count(leads),
    staff: count(staff),
    lastInbound: latestAt(inbound),
    lastWebhookProblem: latestEvent(webhook),
    lastAiReply: latestAt(aiReply),
    lastAiProblem: latestEvent(aiProblem),
    devices:
      deviceCount.state === "ready"
        ? { state: "ready", value: { count: deviceCount.value, scope: admin ? "everyone" : "you" } }
        : deviceCount,
    lastCalendarSync: latestValue(calendarSync, "google_synced_at"),
    lastCalendarError: latestProblem(calendarError, "google_error"),
    lastEmailSent: latestValue(emailSent, "email_sent_at"),
    lastEmailError: latestProblem(emailError, "email_error"),
  }
}
