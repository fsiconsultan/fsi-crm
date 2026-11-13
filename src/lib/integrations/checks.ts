import "server-only"
import { DEFAULT_GRAPH_VERSION, missingOf, redactSecrets, type Env } from "./env"
import { googleConfig, readCalendar } from "./google-calendar"
import {
  TEST_TIMEOUT_MS,
  errorFields,
  networkResult,
  probe,
  stringField,
  timeoutResult,
  type FetchLike,
  type TestResult,
} from "./probe"

// Read-only connection tests, one per outside service. Each one checks its
// keys first and returns "missing" without touching the network; none of them
// sends a message, runs a completion or writes anything.

function providerSaid(provider: string, message: string | null, env: Env) {
  if (!message) return ""
  const clean = redactSecrets(message, env).replace(/\s+/g, " ").trim().slice(0, 200)
  return clean ? ` ${provider} said: "${clean}"` : ""
}

// ---------------------------------------------------------------- OpenAI

export async function testOpenAi(env: Env, fetchFn: FetchLike): Promise<TestResult> {
  const missing = missingOf(["OPENAI_API_KEY", "OPENAI_MODEL"], env)
  if (missing.length) return { state: "missing", missing }
  const model = (env.OPENAI_MODEL ?? "").trim()

  // The same check as models.retrieve(OPENAI_MODEL): it lists nothing and costs nothing.
  const result = await probe(fetchFn, `https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
    headers: { Authorization: `Bearer ${(env.OPENAI_API_KEY ?? "").trim()}` },
  })
  if (result.kind === "timeout") return timeoutResult("OpenAI", result.ms)
  if (result.kind === "network") return networkResult("OpenAI", result.ms)

  const { status, body, ms } = result
  if (status === 200) return { state: "ok", ms, lines: [`The key works and model ${model} is available to it.`] }

  const fields = errorFields(body)
  const said = providerSaid("OpenAI", fields.message, env)
  const code = fields.code ?? `http_${status}`
  if (status === 401) {
    return { state: "error", code, ms, message: `OpenAI rejected the API key. Create a new key and replace OPENAI_API_KEY.${said}` }
  }
  if (status === 403) {
    return { state: "error", code, ms, message: `The key is valid but its project may not use this API or region.${said}` }
  }
  if (status === 404) {
    return { state: "error", code, ms, message: `This key has no model called "${model}". Check the spelling of OPENAI_MODEL.${said}` }
  }
  if (status === 429) {
    const noCredit = fields.code === "insufficient_quota" || fields.type === "insufficient_quota"
    return {
      state: "error",
      code,
      ms,
      message: noCredit
        ? `The OpenAI account has no credit left. Add credit in the OpenAI billing page.${said}`
        : `OpenAI is limiting requests from this key. Try again in a minute.${said}`,
    }
  }
  if (status >= 500) {
    return { state: "error", code, ms, message: `OpenAI had a problem on its side (HTTP ${status}). Try again later.${said}` }
  }
  return { state: "error", code, ms, message: `OpenAI answered with HTTP ${status}.${said}` }
}

// ---------------------------------------------------------------- WhatsApp

export async function testWhatsApp(env: Env, fetchFn: FetchLike): Promise<TestResult> {
  const missing = missingOf(["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"], env)
  if (missing.length) return { state: "missing", missing }

  const version = (env.WHATSAPP_GRAPH_VERSION ?? "").trim() || DEFAULT_GRAPH_VERSION
  const phoneId = (env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim()
  const url = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name,quality_rating`
  const result = await probe(fetchFn, url, {
    headers: { Authorization: `Bearer ${(env.WHATSAPP_ACCESS_TOKEN ?? "").trim()}` },
  })
  if (result.kind === "timeout") return timeoutResult("Meta", result.ms)
  if (result.kind === "network") return networkResult("Meta", result.ms)

  const { status, body, ms } = result
  if (status === 200) {
    const lines = [
      stringField(body, "display_phone_number") ? `Number: ${stringField(body, "display_phone_number")}` : null,
      stringField(body, "verified_name") ? `Business name: ${stringField(body, "verified_name")}` : null,
      stringField(body, "quality_rating") ? `Quality rating: ${stringField(body, "quality_rating")}` : null,
    ].filter((line): line is string => line !== null)
    const unsigned = missingOf(["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"], env)
    if (unsigned.length) lines.push(`Messages cannot arrive yet: ${unsigned.join(" and ")} missing.`)
    return { state: "ok", ms, lines: lines.length ? lines : ["Meta found the phone number."] }
  }

  const fields = errorFields(body)
  const said = providerSaid("Meta", fields.message, env)
  const n = fields.code === null ? NaN : Number(fields.code)
  const code = fields.code !== null ? `meta_${fields.code}` : `http_${status}`
  if (n === 190 || status === 401) {
    return { state: "error", code, ms, message: `Meta rejected the access token; it may have expired. Create a new system user token and replace WHATSAPP_ACCESS_TOKEN.${said}` }
  }
  if (n === 100 || status === 404) {
    return { state: "error", code, ms, message: `Meta does not know this phone number id, or the token cannot see it. Check WHATSAPP_PHONE_NUMBER_ID.${said}` }
  }
  if (n === 10 || (n >= 200 && n <= 299) || status === 403) {
    return { state: "error", code, ms, message: `The token is missing a permission. Give the system user whatsapp_business_management and whatsapp_business_messaging.${said}` }
  }
  if ([4, 17, 32, 613, 80007, 130429].includes(n) || status === 429) {
    return { state: "error", code, ms, message: `Meta is limiting requests right now. Try again in a few minutes.${said}` }
  }
  if (n === 1 || n === 2 || status >= 500) {
    return { state: "error", code, ms, message: `Meta had a problem on its side. Try again later.${said}` }
  }
  return { state: "error", code, ms, message: `Meta answered with HTTP ${status}.${said}` }
}

// ---------------------------------------------------------------- Web Push

function base64UrlBytes(value: string): number | null {
  if (!/^[A-Za-z0-9_-]+=*$/.test(value)) return null
  return Buffer.from(value, "base64url").length
}

// Checks the VAPID keys have the right shape. Sends nothing.
export function testWebPush(env: Env): TestResult {
  const missing = missingOf(["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"], env)
  if (missing.length) return { state: "missing", missing }

  const publicKey = (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim()
  const privateKey = (env.VAPID_PRIVATE_KEY ?? "").trim()
  const subject = (env.VAPID_SUBJECT ?? "").trim()

  const problems: string[] = []
  const publicBytes = base64UrlBytes(publicKey)
  if (publicBytes !== 65 || Buffer.from(publicKey, "base64url")[0] !== 4) {
    problems.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not a VAPID public key (65 bytes, base64url).")
  }
  if (base64UrlBytes(privateKey) !== 32) {
    problems.push("VAPID_PRIVATE_KEY is not a VAPID private key (32 bytes, base64url).")
  }
  if (!/^(mailto:|https:\/\/)/.test(subject)) {
    problems.push("VAPID_SUBJECT must start with mailto: or https://.")
  }
  if (problems.length) {
    return {
      state: "error",
      code: "vapid_invalid",
      ms: null,
      message: `${problems.join(" ")} Generate a new pair with pnpm exec web-push generate-vapid-keys.`,
    }
  }
  return { state: "ok", ms: 0, lines: ["The keys are well formed. No notification was sent."] }
}

// ---------------------------------------------------------------- Google Calendar

// Reads the calendar's name and time zone with the same service account and
// token code the schedule sync uses. Lists, creates and changes no events, so
// it cannot prove write access ("Make changes to events"): the first schedule
// sync does, and its outcome shows on the card.
export async function testGoogleCalendar(env: Env, fetchFn: FetchLike, now: () => Date = () => new Date()): Promise<TestResult> {
  const check = googleConfig(env)
  if (check.state === "missing") return { state: "missing", missing: check.missing }
  if (check.state === "invalid") return { state: "error", code: check.error.code, ms: null, message: check.error.message }
  const { config } = check

  const started = Date.now()
  const result = await readCalendar(config, { fetchFn, now, env })
  const ms = Date.now() - started
  if (!result.ok) {
    const { code, message } = result.error
    if (code === "timeout") return timeoutResult("Google", ms)
    if (code === "network") return networkResult("Google", ms)
    if (code === "http_403" || code === "http_404") {
      return {
        state: "error",
        code,
        ms,
        message: `The service account cannot see this calendar. FSI must share it with ${config.account.clientEmail} ("Make changes to events"), or GOOGLE_CALENDAR_ID is wrong.`,
      }
    }
    return { state: "error", code, ms: code === "bad_private_key" ? null : ms, message }
  }

  const lines = [result.name ? `Calendar found: ${result.name}.` : "Calendar found."]
  if (result.timeZone && result.timeZone !== "Asia/Makassar") {
    lines.push(`Its time zone is ${result.timeZone}. Events are still created in Bali time (Asia/Makassar).`)
  }
  return { state: "ok", ms, lines }
}

// ---------------------------------------------------------------- Supabase

export type ReadResult = { error: { code?: string; message: string } | null }
export type ReadOne = (signal: AbortSignal) => PromiseLike<ReadResult>

type SupabaseReads = { asUser: ReadOne; asServer: ReadOne | null }

async function timedRead(read: ReadOne, clock: () => number) {
  const signal = AbortSignal.timeout(TEST_TIMEOUT_MS)
  const started = clock()
  try {
    const { error } = await read(signal)
    const ms = clock() - started
    if (signal.aborted) return { ok: false as const, ms, timeout: true, error: null }
    return error ? { ok: false as const, ms, timeout: false, error } : { ok: true as const, ms }
  } catch (error) {
    const ms = clock() - started
    return {
      ok: false as const,
      ms,
      timeout: signal.aborted,
      error: { message: error instanceof Error ? error.message : "Unknown error" },
    }
  }
}

function supabaseError(who: string, read: { ms: number; timeout: boolean; error: { code?: string; message: string } | null }, env: Env): TestResult {
  if (read.timeout) return timeoutResult("Supabase", read.ms)
  const code = read.error?.code || "supabase_error"
  const raw = read.error?.message ?? ""
  let message = `The ${who} read failed.`
  if (code === "PGRST301" || /JWT|apikey|API key/i.test(raw)) message = `Supabase rejected the ${who === "server key" ? "secret key" : "session or publishable key"}.`
  else if (code === "42501") message = `The ${who} is not allowed to read leads (permission denied).`
  else if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(raw)) message = "Could not reach Supabase from the server."
  return { state: "error", code, ms: read.ms, message: `${message}${providerSaid("Supabase", raw, env)}` }
}

// One `select id ... limit 1` as the signed-in user (RLS applies), and one with
// the secret key when it is set. Neither writes.
export async function testSupabase(env: Env, reads: SupabaseReads, clock: () => number = Date.now): Promise<TestResult> {
  const missing = missingOf(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"], env)
  if (missing.length) return { state: "missing", missing }

  const user = await timedRead(reads.asUser, clock)
  if (!user.ok) return supabaseError("signed-in", user, env)
  const lines = [`Read as you: OK in ${user.ms} ms.`]
  let ms = user.ms

  if (reads.asServer) {
    const server = await timedRead(reads.asServer, clock)
    if (!server.ok) return supabaseError("server key", server, env)
    lines.push(`Read with the secret key: OK in ${server.ms} ms.`)
    ms = Math.max(ms, server.ms)
  } else {
    lines.push("Secret key not set, so the server read was skipped.")
  }
  return { state: "ok", ms, lines }
}
