import "server-only"
import { missingOf, redactSecrets, type Env } from "./env"
import { errorFields, probe, stringField, TEST_TIMEOUT_MS, type FetchLike, type TestResult } from "./probe"

// Email through Resend's REST API with plain fetch (the SDK adds nothing for
// one POST). Server-only: the key never leaves the server.

const RESEND = "https://api.resend.com"

export type EmailConfig = { apiKey: string; from: string; fromAddress: string; replyTo: string | null }

export type EmailConfigCheck =
  | { state: "missing"; missing: string[] }
  | { state: "invalid"; message: string }
  | { state: "ok"; config: EmailConfig }

/** "French Solar Industry <crm@example.com>" or "crm@example.com" -> "crm@example.com". */
export function addressOf(value: string): string | null {
  const match = /<([^<>\s]+@[^<>\s]+)>\s*$/.exec(value.trim()) ?? /^([^<>\s]+@[^<>\s]+)$/.exec(value.trim())
  return match ? match[1] : null
}

export function emailConfig(env: Env): EmailConfigCheck {
  const missing = missingOf(["RESEND_API_KEY", "EMAIL_FROM"], env)
  if (missing.length) return { state: "missing", missing }
  const from = (env.EMAIL_FROM ?? "").trim()
  const fromAddress = addressOf(from)
  if (!fromAddress) {
    return { state: "invalid", message: 'EMAIL_FROM must be an address, like "French Solar Industry <crm@your-domain>".' }
  }
  const replyTo = (env.EMAIL_REPLY_TO ?? "").trim() || null
  return { state: "ok", config: { apiKey: (env.RESEND_API_KEY ?? "").trim(), from, fromAddress, replyTo } }
}

export type OutgoingEmail = {
  to: string
  subject: string
  text: string
  attachment: { filename: string; content: string; contentType: string }
  /** Same key, same email: Resend sends it once even if the request is retried. */
  idempotencyKey: string
}

export type SendResult = { ok: true; messageId: string } | { ok: false; code: string; message: string }

export function mapResendError(status: number, body: unknown, env: Env = process.env): { code: string; message: string } {
  const fields = errorFields(body)
  const name = stringField(body, "name")
  const raw = stringField(body, "message") ?? fields.message ?? ""
  const said = raw ? ` Resend said: "${redactSecrets(raw, env).replace(/\s+/g, " ").slice(0, 160)}"` : ""
  const code = name ?? `http_${status}`
  if (status === 401 || name === "missing_api_key" || name === "invalid_api_key") {
    return { code, message: `Resend rejected the API key. Create a new key and replace RESEND_API_KEY.${said}` }
  }
  if (status === 403) {
    return {
      code,
      message: /domain/i.test(raw)
        ? `The sender domain is not verified in Resend. Verify it there, or change EMAIL_FROM.${said}`
        : `Resend refused to send with this key.${said}`,
    }
  }
  if (status === 422 || status === 400) return { code, message: `Resend refused the email as invalid.${said}` }
  if (status === 429) return { code, message: `Resend is limiting requests right now. Try again in a minute.${said}` }
  if (status >= 500) return { code, message: `Resend had a problem on its side (HTTP ${status}). Try again later.${said}` }
  return { code, message: `Resend answered with HTTP ${status}.${said}` }
}

export async function sendEmail(
  config: EmailConfig,
  email: OutgoingEmail,
  fetchFn: FetchLike,
  env: Env = process.env,
): Promise<SendResult> {
  const result = await probe(fetchFn, `${RESEND}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from: config.from,
      to: [email.to],
      reply_to: config.replyTo ?? undefined,
      subject: email.subject,
      text: email.text,
      attachments: [
        { filename: email.attachment.filename, content: email.attachment.content, content_type: email.attachment.contentType },
      ],
    }),
  })
  if (result.kind === "timeout") {
    // The request may still have been accepted. It is reported as failed, never
    // as sent; the idempotency key stops a retry from sending it twice.
    return {
      ok: false,
      code: "timeout",
      message: `Resend did not answer within ${TEST_TIMEOUT_MS / 1000} seconds. The email may or may not have gone out.`,
    }
  }
  if (result.kind === "network") return { ok: false, code: "network", message: "Could not reach Resend from the server." }
  const id = stringField(result.body, "id")
  if (result.status === 200 && id) return { ok: true, messageId: id }
  return { ok: false, ...mapResendError(result.status, result.body, env) }
}

// Read-only connection test: lists the account's domains (GET /domains) to
// confirm the key and that the sender's domain is verified. Never sends.
export async function testResend(env: Env, fetchFn: FetchLike): Promise<TestResult> {
  const check = emailConfig(env)
  if (check.state === "missing") return { state: "missing", missing: check.missing }
  if (check.state === "invalid") return { state: "error", code: "bad_email_from", ms: null, message: check.message }
  const { config } = check
  const domain = config.fromAddress.split("@")[1].toLowerCase()

  const result = await probe(fetchFn, `${RESEND}/domains`, { headers: { Authorization: `Bearer ${config.apiKey}` } })
  if (result.kind === "timeout") {
    return { state: "error", code: "timeout", ms: result.ms, message: `Resend did not answer within ${TEST_TIMEOUT_MS / 1000} seconds.` }
  }
  if (result.kind === "network") return { state: "error", code: "network", ms: result.ms, message: "Could not reach Resend from the server." }

  const { status, body, ms } = result
  if (status === 401 && stringField(body, "name") === "restricted_api_key") {
    return {
      state: "ok",
      ms,
      lines: [
        "The key is valid but limited to sending, so the domain list could not be read.",
        `Check in Resend that ${domain} is verified. No email was sent.`,
      ],
    }
  }
  if (status !== 200) {
    const mapped = mapResendError(status, body, env)
    return { state: "error", code: mapped.code, ms, message: mapped.message }
  }

  const list = Array.isArray((body as { data?: unknown })?.data) ? (body as { data: unknown[] }).data : []
  const match = list.find((item) => stringField(item, "name")?.toLowerCase() === domain)
  const domainStatus = match ? stringField(match, "status") : null
  if (!match) {
    return {
      state: "error",
      code: "domain_missing",
      ms,
      message: `The key works, but ${domain} (from EMAIL_FROM) is not added in Resend. Add and verify it there.`,
    }
  }
  if (domainStatus !== "verified") {
    return {
      state: "error",
      code: "domain_not_verified",
      ms,
      message: `The key works, but ${domain} is ${domainStatus ?? "not verified"} in Resend. Finish its DNS records there.`,
    }
  }
  return { state: "ok", ms, lines: [`The key works and ${domain} is verified.`, "No email was sent."] }
}
