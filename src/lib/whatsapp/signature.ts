import { createHmac, timingSafeEqual } from "node:crypto"

// Meta signs the raw request body with the app secret and sends
// "sha256=<hex>" in X-Hub-Signature-256. The check must run on the exact bytes
// received, before any JSON parsing.
export function signBody(rawBody: string, appSecret: string) {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`
}

export function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined) {
  if (!appSecret || !header) return false

  const expected = Buffer.from(signBody(rawBody, appSecret))
  const received = Buffer.from(header.trim())

  return expected.length === received.length && timingSafeEqual(expected, received)
}
