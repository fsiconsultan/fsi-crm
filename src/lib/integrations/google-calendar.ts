import "server-only"
import { createSign } from "node:crypto"
import { localDay } from "@/lib/schedules/time"
import { OFFICE_TIME_ZONE, type TimeZoneId } from "@/lib/schedules/zones"
import { missingOf, redactSecrets, type Env } from "./env"
import { probe, stringField, TEST_TIMEOUT_MS, type FetchLike, type Probe } from "./probe"

// Google Calendar through a service account (JWT bearer grant) with plain
// fetch: one signed assertion and three REST calls do not justify the
// google-auth-library dependency. Events carry no attendees: a service account
// cannot invite people without Workspace domain-wide delegation, and FSI's
// account type is not known. The CRM's own email covers the lead.

export const EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events"
export const READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
const API = "https://www.googleapis.com/calendar/v3"

export type ServiceAccount = { clientEmail: string; privateKey: string }
export type GoogleConfig = { calendarId: string; account: ServiceAccount }
export type GoogleError = { code: string; message: string }
export type GoogleResult<T> = ({ ok: true } & T) | { ok: false; error: GoogleError }

export type ConfigCheck =
  | { state: "missing"; missing: string[] }
  | { state: "invalid"; error: GoogleError }
  | { state: "ok"; config: GoogleConfig }

export function readServiceAccount(json: string): ServiceAccount | null {
  try {
    const parsed: unknown = JSON.parse(json)
    const clientEmail = stringField(parsed, "client_email")
    const privateKey = stringField(parsed, "private_key")
    return clientEmail && privateKey ? { clientEmail, privateKey } : null
  } catch {
    return null
  }
}

export function googleConfig(env: Env): ConfigCheck {
  const missing = missingOf(["GOOGLE_CALENDAR_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"], env)
  if (missing.length) return { state: "missing", missing }
  const account = readServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "")
  if (!account) {
    return {
      state: "invalid",
      error: {
        code: "bad_service_account",
        message: "GOOGLE_SERVICE_ACCOUNT_JSON is not a service account key file (client_email and private_key are needed).",
      },
    }
  }
  return { state: "ok", config: { calendarId: (env.GOOGLE_CALENDAR_ID ?? "").trim(), account } }
}

export function signedAssertion(account: ServiceAccount, scope: string, nowSeconds: number) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  })}`
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.privateKey).toString("base64url")
  return `${unsigned}.${signature}`
}

function transportError(result: Exclude<Probe, { kind: "response" }>): GoogleError {
  if (result.kind === "timeout") {
    return { code: "timeout", message: `Google did not answer within ${TEST_TIMEOUT_MS / 1000} seconds.` }
  }
  return { code: "network", message: "Could not reach Google from the server." }
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/** For tests. */
export function clearTokenCache() {
  tokenCache.clear()
}

export async function accessToken(
  account: ServiceAccount,
  scope: string,
  fetchFn: FetchLike,
  now: () => Date,
  useCache = true,
): Promise<GoogleResult<{ token: string }>> {
  const key = `${account.clientEmail} ${scope}`
  const cached = useCache ? tokenCache.get(key) : undefined
  if (cached && cached.expiresAt > now().getTime() + 60_000) return { ok: true, token: cached.token }

  let assertion: string
  try {
    assertion = signedAssertion(account, scope, Math.floor(now().getTime() / 1000))
  } catch {
    return {
      ok: false,
      error: { code: "bad_private_key", message: "The private key in GOOGLE_SERVICE_ACCOUNT_JSON could not be read." },
    }
  }

  const result = await probe(fetchFn, "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  })
  if (result.kind !== "response") return { ok: false, error: transportError(result) }

  const token = stringField(result.body, "access_token")
  if (result.status !== 200 || !token) {
    return {
      ok: false,
      error: {
        code: stringField(result.body, "error") ?? `http_${result.status}`,
        message:
          "Google rejected the service account key (invalid credentials). Create a new key for the service account and replace GOOGLE_SERVICE_ACCOUNT_JSON.",
      },
    }
  }
  const expiresIn = typeof (result.body as { expires_in?: unknown })?.expires_in === "number"
    ? (result.body as { expires_in: number }).expires_in
    : 3600
  if (useCache) tokenCache.set(key, { token, expiresAt: now().getTime() + expiresIn * 1000 })
  return { ok: true, token }
}

function googleReason(body: unknown): { reason: string | null; message: string | null } {
  const error = (body as { error?: { message?: unknown; errors?: Array<{ reason?: unknown }> } } | null)?.error
  const reason = error?.errors?.[0]?.reason
  return {
    reason: typeof reason === "string" ? reason : null,
    message: typeof error?.message === "string" ? error.message : null,
  }
}

/** Plain-language message for a Calendar API error. Never includes a key. */
export function mapGoogleError(status: number, body: unknown, config: GoogleConfig, env: Env = process.env): GoogleError {
  const { reason, message } = googleReason(body)
  const said = message ? ` Google said: "${redactSecrets(message, env).replace(/\s+/g, " ").slice(0, 160)}"` : ""
  const email = config.account.clientEmail
  if (status === 401) {
    return {
      code: "http_401",
      message: `Google rejected the service account's credentials. Create a new key and replace GOOGLE_SERVICE_ACCOUNT_JSON.${said}`,
    }
  }
  if (status === 429 || (status === 403 && reason && /rateLimit|usageLimits|quotaExceeded/i.test(reason))) {
    return { code: `http_${status}`, message: `Google is limiting requests right now. Try again in a few minutes.${said}` }
  }
  if (status === 403) {
    return {
      code: "http_403",
      message: `The calendar is not shared with the CRM. Share it with ${email} and choose "Make changes to events".${said}`,
    }
  }
  if (status === 404) {
    return {
      code: "http_404",
      message: `Calendar not found. Check GOOGLE_CALENDAR_ID, and that the calendar is shared with ${email}.${said}`,
    }
  }
  if (status >= 500) {
    return { code: `http_${status}`, message: `Google had a problem on its side (HTTP ${status}). Try again later.${said}` }
  }
  return { code: `http_${status}`, message: `Google answered with HTTP ${status}.${said}` }
}

export type CalendarEvent = {
  scheduleId: string
  title: string
  description: string
  location: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  /** The booking's zone (lead_schedules.time_zone). Default WITA. */
  timeZone?: TimeZoneId
}

/** The schedule id without hyphens: valid Google event id characters (base32hex), and stable. */
export function eventIdFor(scheduleId: string) {
  return scheduleId.replace(/-/g, "").toLowerCase()
}

export function eventBody(event: CalendarEvent) {
  // A follow-up has no end; the calendar shows it as a 30 minute slot.
  const end = event.endsAt ?? new Date(Date.parse(event.startsAt) + (event.allDay ? 86_400_000 : 1_800_000)).toISOString()
  // The event's zone is the customer's: Google shows it there and in the CRM calendar's own zone.
  const timeZone = event.timeZone ?? OFFICE_TIME_ZONE
  return {
    summary: event.title,
    description: event.description,
    location: event.location ?? undefined,
    start: event.allDay ? { date: localDay(event.startsAt, timeZone) } : { dateTime: event.startsAt, timeZone },
    end: event.allDay ? { date: localDay(end, timeZone) } : { dateTime: end, timeZone },
    status: "confirmed",
    extendedProperties: { private: { crmScheduleId: event.scheduleId } },
  }
}

type Deps = { fetchFn: FetchLike; now: () => Date; env?: Env }

async function authorized(config: GoogleConfig, deps: Deps) {
  return accessToken(config.account, EVENTS_SCOPE, deps.fetchFn, deps.now)
}

/**
 * Create the event, or update it when it already exists. The event id is
 * derived from the schedule id, so a retry after a timeout can never create a
 * second event: Google answers 409 and the existing one is updated instead.
 */
export async function upsertEvent(
  config: GoogleConfig,
  event: CalendarEvent,
  deps: Deps,
): Promise<GoogleResult<{ eventId: string }>> {
  const auth = await authorized(config, deps)
  if (!auth.ok) return auth
  const eventId = eventIdFor(event.scheduleId)
  const base = `${API}/calendars/${encodeURIComponent(config.calendarId)}/events`
  const headers = { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" }
  const body = eventBody(event)

  const insert = await probe(deps.fetchFn, base, { method: "POST", headers, body: JSON.stringify({ id: eventId, ...body }) })
  if (insert.kind !== "response") return { ok: false, error: transportError(insert) }
  if (insert.status === 200) return { ok: true, eventId: stringField(insert.body, "id") ?? eventId }
  if (insert.status !== 409) return { ok: false, error: mapGoogleError(insert.status, insert.body, config, deps.env) }

  const patch = await probe(deps.fetchFn, `${base}/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
  if (patch.kind !== "response") return { ok: false, error: transportError(patch) }
  if (patch.status === 200) return { ok: true, eventId }
  return { ok: false, error: mapGoogleError(patch.status, patch.body, config, deps.env) }
}

/** Remove the event. Already gone (404 or 410) counts as removed. */
export async function cancelEvent(config: GoogleConfig, eventId: string, deps: Deps): Promise<GoogleResult<object>> {
  const auth = await authorized(config, deps)
  if (!auth.ok) return auth
  const result = await probe(
    deps.fetchFn,
    `${API}/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } },
  )
  if (result.kind !== "response") return { ok: false, error: transportError(result) }
  if (result.status === 204 || result.status === 200 || result.status === 404 || result.status === 410) return { ok: true }
  return { ok: false, error: mapGoogleError(result.status, result.body, config, deps.env) }
}

/** Read-only: the calendar's name and time zone, for the Settings test. Always signs in afresh. */
export async function readCalendar(
  config: GoogleConfig,
  deps: Deps,
): Promise<GoogleResult<{ name: string | null; timeZone: string | null; ms: number }>> {
  const started = Date.now()
  const auth = await accessToken(config.account, `${READONLY_SCOPE} ${EVENTS_SCOPE}`, deps.fetchFn, deps.now, false)
  if (!auth.ok) return auth
  const result = await probe(deps.fetchFn, `${API}/calendars/${encodeURIComponent(config.calendarId)}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (result.kind !== "response") return { ok: false, error: transportError(result) }
  if (result.status !== 200) return { ok: false, error: mapGoogleError(result.status, result.body, config, deps.env) }
  return {
    ok: true,
    name: stringField(result.body, "summary"),
    timeZone: stringField(result.body, "timeZone"),
    ms: Date.now() - started,
  }
}
