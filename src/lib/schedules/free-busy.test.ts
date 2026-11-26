import { generateKeyPairSync } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { googleBusy } = await import("./free-busy")
const { clearTokenCache } = await import("@/lib/integrations/google-calendar")

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
const CALENDAR = "fsi@group.calendar.google.com"
const env = {
  GOOGLE_CALENDAR_ID: CALENDAR,
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "crm@fsi.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  }),
}
const FROM = "2026-11-17T01:00:00.000Z"
const TO = "2026-11-17T09:00:00.000Z"

function fakeFetch(freeBusy: { status: number; body: unknown }) {
  const calls: Array<{ url: string; method: string; body: string }> = []
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: String(init?.body ?? "") })
    if (url.includes("oauth2.googleapis.com/token")) return Response.json({ access_token: "ya29.t", expires_in: 3600 })
    return Response.json(freeBusy.body, { status: freeBusy.status })
  })
  return { fetchFn, calls }
}

beforeEach(() => clearTokenCache())

describe("googleBusy", () => {
  it("is not connected without the Google keys, and makes no request", async () => {
    const { fetchFn } = fakeFetch({ status: 200, body: {} })
    expect(await googleBusy(FROM, TO, { env: {}, fetchFn, now: () => new Date() })).toEqual({ state: "not_connected" })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("reads the shared calendar's busy blocks with one read-only FreeBusy query", async () => {
    const { fetchFn, calls } = fakeFetch({
      status: 200,
      body: { calendars: { [CALENDAR]: { busy: [{ start: "2026-11-17T02:00:00Z", end: "2026-11-17T03:00:00Z" }] } } },
    })
    const result = await googleBusy(FROM, TO, { env, fetchFn, now: () => new Date() })
    expect(result).toEqual({ state: "ok", busy: [{ start: Date.parse("2026-11-17T02:00:00Z"), end: Date.parse("2026-11-17T03:00:00Z") }] })
    const query = calls.find((c) => c.url.endsWith("/freeBusy"))
    expect(query?.method).toBe("POST")
    expect(JSON.parse(query!.body)).toEqual({ timeMin: FROM, timeMax: TO, items: [{ id: CALENDAR }] })
    expect(calls.filter((c) => !c.url.includes("oauth2")).map((c) => c.url)).toEqual(["https://www.googleapis.com/calendar/v3/freeBusy"])
  })

  it("fails instead of reporting free when Google cannot answer for the calendar", async () => {
    const notShared = fakeFetch({ status: 200, body: { calendars: { [CALENDAR]: { errors: [{ reason: "notFound" }], busy: [] } } } })
    expect(await googleBusy(FROM, TO, { env, fetchFn: notShared.fetchFn, now: () => new Date() })).toMatchObject({ state: "failed" })
    const limited = fakeFetch({ status: 429, body: { error: { message: "Rate Limit Exceeded" } } })
    expect(await googleBusy(FROM, TO, { env, fetchFn: limited.fetchFn, now: () => new Date() })).toMatchObject({
      state: "failed",
      message: expect.stringMatching(/limiting requests/),
    })
  })
})
