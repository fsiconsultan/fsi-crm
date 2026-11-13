"use server"

import { getProfile, isAdmin } from "@/lib/auth"
import { testResend } from "@/lib/integrations/email"
import {
  testGoogleCalendar,
  testOpenAi,
  testSupabase,
  testWebPush,
  testWhatsApp,
} from "@/lib/integrations/checks"
import type { TestResult } from "@/lib/integrations/probe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/whatsapp/admin-client"

// Every action is reachable by a direct POST, so each one checks the Admin
// role itself before anything else runs. Results carry plain text only.
async function adminOnly(run: () => Promise<TestResult>): Promise<TestResult> {
  const profile = await getProfile()
  if (!isAdmin(profile)) return { state: "denied" }
  return run()
}

export async function testSupabaseConnection(): Promise<TestResult> {
  return adminOnly(async () => {
    const env = process.env
    const missingBase = !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (missingBase) return testSupabase(env, { asUser: async () => ({ error: null }), asServer: null })

    const supabase = await createClient()
    const admin = createAdminClient()
    return testSupabase(env, {
      asUser: (signal) => supabase.from("leads").select("id").limit(1).abortSignal(signal),
      asServer: admin ? (signal) => admin.from("leads").select("id").limit(1).abortSignal(signal) : null,
    })
  })
}

export async function testWhatsAppConnection(): Promise<TestResult> {
  return adminOnly(() => testWhatsApp(process.env, fetch))
}

export async function testOpenAiConnection(): Promise<TestResult> {
  return adminOnly(() => testOpenAi(process.env, fetch))
}

export async function testPushConnection(): Promise<TestResult> {
  return adminOnly(async () => testWebPush(process.env))
}

export async function testCalendarConnection(): Promise<TestResult> {
  return adminOnly(() => testGoogleCalendar(process.env, fetch))
}

export async function testEmailConnection(): Promise<TestResult> {
  return adminOnly(() => testResend(process.env, fetch))
}
