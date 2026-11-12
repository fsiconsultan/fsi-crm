"use server"

import { getProfile } from "@/lib/auth"
import { inboxClient } from "@/lib/whatsapp/inbox"

export type DeviceResult = { ok: true } | { ok: false; error: string }

type Keys = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

const NOT_SET_UP = "Notifications are not set up on the server yet."

function missing(code: string | undefined) {
  // PGRST202: function not found; PGRST205 / 42P01: table not found.
  return code === "PGRST202" || code === "PGRST205" || code === "42P01"
}

// Saves this browser's subscription for the signed-in user. Goes through the
// register_push_subscription function, so a shared device moves to whoever
// turned notifications on last.
export async function saveDevice(subscription: Keys, userAgent: string): Promise<DeviceResult> {
  await getProfile()
  const { endpoint, keys } = subscription
  if (!endpoint || !keys?.p256dh || !keys.auth) return { ok: false, error: "The browser returned an incomplete subscription." }

  const db = await inboxClient()
  const { error } = await db.rpc("register_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  })
  if (error) return { ok: false, error: missing(error.code) ? NOT_SET_UP : `Could not save this device: ${error.message}` }
  return { ok: true }
}

export async function removeDevice(endpoint: string): Promise<DeviceResult> {
  await getProfile()
  const db = await inboxClient()
  // RLS limits this to the signed-in user's own rows.
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint)
  if (error && !missing(error.code)) return { ok: false, error: `Could not remove this device: ${error.message}` }
  return { ok: true }
}
