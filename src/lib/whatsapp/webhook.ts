import { createHash, timingSafeEqual } from "node:crypto"
import type { PendingReply } from "./ingest"
import { ingestEvents } from "./ingest"
import { parseWebhook } from "./payload"
import { verifySignature } from "./signature"
import { safeLog, type WaStore } from "./store"

// GET: Meta's one-time subscription check. Echo hub.challenge only when the
// verify token matches.
export function handleVerification(params: URLSearchParams, verifyToken: string | undefined) {
  const matches =
    !!verifyToken && params.get("hub.mode") === "subscribe" && sameSecret(params.get("hub.verify_token"), verifyToken)

  const challenge = params.get("hub.challenge")
  if (matches && challenge) return { status: 200, body: challenge }
  return { status: 403, body: "Forbidden" }
}

// Constant-time comparison; hashing first makes both sides the same length.
function sameSecret(given: string | null, expected: string) {
  if (given === null) return false
  const a = createHash("sha256").update(given).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}

export type DeliveryResult = { status: number; body: string; pending: PendingReply[] }

// POST: one webhook delivery. Checks the signature on the raw body, stores what
// arrived, and returns the customer messages that still need an AI reply. The
// route sends the 200 first and answers those afterwards.
export async function handleDelivery(input: {
  rawBody: string
  signature: string | null
  appSecret: string | undefined
  store: WaStore | null
  now: Date
  // WHATSAPP_PHONE_NUMBER_ID: changes for other numbers are skipped and logged.
  phoneNumberId?: string
}): Promise<DeliveryResult> {
  const { rawBody, signature, appSecret, store, now } = input

  if (!verifySignature(rawBody, signature, appSecret)) {
    return { status: 401, body: "Invalid signature", pending: [] }
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    // Signed but not JSON: nothing to retry, so acknowledge it.
    return { status: 200, body: "Ignored", pending: [] }
  }

  const otherNumbers = new Set<string>()
  const events = parseWebhook(payload, {
    phoneNumberId: input.phoneNumberId,
    onOtherNumber: (number) => otherNumbers.add(number ?? "unknown"),
  })
  if (otherNumbers.size > 0 && store) {
    await safeLog(store, {
      type: "webhook_error",
      severity: "warning",
      summary: `Ignored a WhatsApp delivery for another phone number on the Meta app (${[...otherNumbers].join(", ")}).`,
      detail: { phone_number_ids: [...otherNumbers] },
    })
  }
  if (events.length === 0) return { status: 200, body: "OK", pending: [] }

  // Not answering 200 makes Meta retry later, which is what we want while the
  // database is unreachable or the secret key is not set yet.
  if (!store) return { status: 503, body: "Storage is not configured", pending: [] }

  try {
    const pending = await ingestEvents(store, events, now)
    return { status: 200, body: "OK", pending }
  } catch (error) {
    console.error("WhatsApp webhook could not store a delivery", error)
    return { status: 500, body: "Could not store the delivery", pending: [] }
  }
}
