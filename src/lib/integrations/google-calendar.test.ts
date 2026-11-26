import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { eventBody, eventIdFor, googleConfig, mapGoogleError } = await import("./google-calendar")

const config = { calendarId: "fsi@group.calendar.google.com", account: { clientEmail: "crm@fsi.iam.gserviceaccount.com", privateKey: "x" } }

describe("Google error mapping", () => {
  it("maps each status to a plain message", () => {
    expect(mapGoogleError(401, null, config, {}).message).toMatch(/rejected the service account's credentials/)
    expect(mapGoogleError(403, { error: { errors: [{ reason: "requiredAccessLevel" }] } }, config, {}).message).toMatch(
      /Share it with crm@fsi.iam.gserviceaccount.com and choose "Make changes to events"/,
    )
    expect(mapGoogleError(404, null, config, {}).message).toMatch(/Calendar not found. Check GOOGLE_CALENDAR_ID/)
    expect(mapGoogleError(429, null, config, {}).message).toMatch(/limiting requests/)
    expect(mapGoogleError(403, { error: { errors: [{ reason: "rateLimitExceeded" }] } }, config, {}).message).toMatch(/limiting requests/)
    expect(mapGoogleError(503, null, config, {}).message).toMatch(/problem on its side/)
  })

  it("never echoes a key Google repeats back", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"
    const result = mapGoogleError(400, { error: { message: `bad ${pem}` } }, config, {})
    expect(result.message).not.toContain("PRIVATE KEY")
  })
})

describe("Google config and event body", () => {
  it("is missing without both variables, invalid with a bad key file", () => {
    expect(googleConfig({})).toMatchObject({ state: "missing" })
    expect(googleConfig({ GOOGLE_CALENDAR_ID: "c", GOOGLE_SERVICE_ACCOUNT_JSON: "{}" })).toMatchObject({ state: "invalid" })
  })

  it("derives a valid, stable event id and gives a follow-up a 30 minute slot", () => {
    expect(eventIdFor("0A1B2C3D-0000-4000-8000-00000000000F")).toBe("0a1b2c3d00004000800000000000000f")
    const body = eventBody({
      scheduleId: "s1",
      title: "Follow-up: Pak Made",
      description: "",
      location: null,
      startsAt: "2026-11-20T02:00:00.000Z",
      endsAt: null,
      allDay: false,
    })
    expect(body.end).toEqual({ dateTime: "2026-11-20T02:30:00.000Z", timeZone: "Asia/Makassar" })
    const allDay = eventBody({ scheduleId: "s1", title: "t", description: "", location: null, startsAt: "2026-11-19T16:00:00.000Z", endsAt: "2026-11-20T16:00:00.000Z", allDay: true })
    expect([allDay.start, allDay.end]).toEqual([{ date: "2026-11-20" }, { date: "2026-11-21" }])
  })
})
