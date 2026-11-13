import "server-only"
import type { Env } from "@/lib/integrations/env"
import { accessToken, googleConfig, mapGoogleError, READONLY_SCOPE } from "@/lib/integrations/google-calendar"
import { probe, type FetchLike } from "@/lib/integrations/probe"
import type { Interval } from "./availability"

export type GoogleBusy =
  | { state: "not_connected" }
  | { state: "ok"; busy: Interval[] }
  | { state: "failed"; message: string }

/**
 * Busy times on the shared calendar (GOOGLE_CALENDAR_ID) through the FreeBusy
 * API. Read-only: it never creates, changes or reads event details.
 */
export async function googleBusy(
  fromIso: string,
  toIso: string,
  deps: { env: Env; fetchFn: FetchLike; now: () => Date },
): Promise<GoogleBusy> {
  const config = googleConfig(deps.env)
  if (config.state === "missing") return { state: "not_connected" }
  if (config.state === "invalid") return { state: "failed", message: config.error.message }

  const auth = await accessToken(config.config.account, READONLY_SCOPE, deps.fetchFn, deps.now)
  if (!auth.ok) return { state: "failed", message: auth.error.message }

  const calendarId = config.config.calendarId
  const result = await probe(deps.fetchFn, "https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: fromIso, timeMax: toIso, items: [{ id: calendarId }] }),
  })
  if (result.kind === "timeout") return { state: "failed", message: "Google did not answer in time." }
  if (result.kind === "network") return { state: "failed", message: "Could not reach Google from the server." }
  if (result.status !== 200) return { state: "failed", message: mapGoogleError(result.status, result.body, config.config, deps.env).message }

  const entry = (result.body as { calendars?: Record<string, { busy?: unknown; errors?: unknown }> } | null)?.calendars?.[calendarId]
  if (!entry || (Array.isArray(entry.errors) && entry.errors.length > 0) || !Array.isArray(entry.busy)) {
    return {
      state: "failed",
      message: "Google did not return the shared calendar's busy times. Check GOOGLE_CALENDAR_ID and that the calendar is shared with the CRM.",
    }
  }
  const busy: Interval[] = []
  for (const block of entry.busy as Array<{ start?: unknown; end?: unknown }>) {
    const start = typeof block.start === "string" ? Date.parse(block.start) : NaN
    const end = typeof block.end === "string" ? Date.parse(block.end) : NaN
    // A block that cannot be read makes the whole answer untrustworthy.
    if (Number.isNaN(start) || Number.isNaN(end)) return { state: "failed", message: "Google returned a busy time that could not be read." }
    busy.push({ start, end })
  }
  return { state: "ok", busy }
}
