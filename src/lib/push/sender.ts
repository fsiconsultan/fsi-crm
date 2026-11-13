import "server-only"
import { sendNotification, WebPushError } from "web-push"
import type { PushSender } from "./types"

const SEND_TIMEOUT_MS = 5000

// Web Push with VAPID. Returns null until all three env vars are set; callers
// then skip notifications entirely.
export function webPushSenderFromEnv(): PushSender | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return null

  const vapidDetails = { subject, publicKey, privateKey }

  return {
    async send(target, payload) {
      try {
        await sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          JSON.stringify(payload),
          // A hung push service must not hold up the AI reply that follows.
          { vapidDetails, TTL: 60 * 60 * 12, urgency: "high", timeout: SEND_TIMEOUT_MS },
        )
        return { ok: true }
      } catch (error) {
        const statusCode = error instanceof WebPushError ? error.statusCode : null
        return { ok: false, statusCode, message: error instanceof Error ? error.message : "Unknown error" }
      }
    },
  }
}
