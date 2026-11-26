import "server-only"
import { headers } from "next/headers"
import { getProfile, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ScheduleDeps } from "./service"
import { supabaseScheduleStore } from "./supabase-store"

async function siteOrigin(): Promise<string | null> {
  try {
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    if (!host) return null
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
    const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https")
    return `${proto}://${host}`
  } catch {
    return null
  }
}

/** The schedule service acting as the signed-in user (RLS applies). */
export async function userScheduleDeps(): Promise<ScheduleDeps> {
  const profile = await getProfile()
  return {
    store: supabaseScheduleStore(await createClient()),
    actor: { id: profile.id, admin: isAdmin(profile) },
    env: process.env,
    fetchFn: fetch,
    now: () => new Date(),
    baseUrl: await siteOrigin(),
  }
}
