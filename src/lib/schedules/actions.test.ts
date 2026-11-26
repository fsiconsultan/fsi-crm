import { generateKeyPairSync } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FakeScheduleStore } from "./testing"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "crm.example.test", "x-forwarded-proto": "https" }) }))

const SALES_A = "10000000-0000-4000-8000-00000000000a"
const SALES_B = "10000000-0000-4000-8000-00000000000b"
const ADMIN = "10000000-0000-4000-8000-00000000000c"

const profile = { current: { id: SALES_A, role: "Sales", name: "Ayu" } as { id: string; role: string; name: string } | null }
const store = { current: new FakeScheduleStore() }

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(async () => {
    if (!profile.current) throw new Error("NEXT_REDIRECT /login")
    return profile.current
  }),
  isAdmin: (p: { role: string }) => p.role === "Admin",
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }))
vi.mock("./supabase-store", () => ({ supabaseScheduleStore: () => store.current }))

const { createSchedule, rescheduleSchedule, cancelSchedule, markScheduleDone } = await import("./actions")
const { cancelSchedulesBeforeLeadDelete } = await import("./service")
const { clearTokenCache } = await import("@/lib/integrations/google-calendar")
const { revalidatePath } = await import("next/cache")

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
const GOOGLE_ENV = {
  GOOGLE_CALENDAR_ID: "fsi@group.calendar.google.com",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "crm@fsi.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  }),
}
const EMAIL_ENV = { RESEND_API_KEY: "re_test_SECRET_123456", EMAIL_FROM: "French Solar Industry <crm@fsi.example>", EMAIL_REPLY_TO: "hello@fsi.example" }

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> }
type Route = (call: Call) => { status: number; body?: unknown } | undefined

let calls: Call[] = []
let routes: Route[] = []
const fetchSpy = vi.spyOn(globalThis, "fetch")

function useFetch(...handlers: Route[]) {
  routes = handlers
}

const googleToken: Route = (c) => (c.url.includes("oauth2.googleapis.com/token") ? { status: 200, body: { access_token: "ya29.t", expires_in: 3600 } } : undefined)

function setEnv(values: Record<string, string>) {
  for (const name of ["GOOGLE_CALENDAR_ID", "GOOGLE_SERVICE_ACCOUNT_JSON", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO"]) {
    vi.stubEnv(name, values[name] ?? "")
  }
}

const NEXT_WEEK = "2026-11-20"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-13T02:00:00Z")) // 10:00 in Bali
  store.current = new FakeScheduleStore()
  store.current.addLead({ id: 1, customer_name: "Pak Made", sales_id: SALES_A, email: "made@example.com" })
  store.current.addLead({ id: 2, customer_name: "Ibu Sari", sales_id: SALES_B })
  store.current.names.set(SALES_A, "Ayu")
  store.current.visibleLeads = new Set([1])
  profile.current = { id: SALES_A, role: "Sales", name: "Ayu" }
  calls = []
  routes = []
  clearTokenCache()
  setEnv({})
  fetchSpy.mockReset()
  fetchSpy.mockImplementation(async (input, init) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init?.body,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    }
    calls.push(call)
    for (const route of routes) {
      const answer = route(call)
      if (answer) return new Response(answer.body === undefined ? null : JSON.stringify(answer.body), { status: answer.status })
    }
    throw new Error(`unexpected request ${call.method} ${call.url}`)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.mocked(revalidatePath).mockClear()
})

const base = { leadId: 1, kind: "site_survey" as const, date: NEXT_WEEK, startTime: "10:00" }

function only<T>(result: T & { ok: boolean }) {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`)
  return result as Extract<T, { ok: true }>
}

describe("auth and validation", () => {
  it("refuses before touching anything when nobody is signed in", async () => {
    profile.current = null
    await expect(createSchedule(base)).rejects.toThrow("NEXT_REDIRECT")
    expect(store.current.rows.size).toBe(0)
  })

  it("returns field errors and saves nothing for bad input", async () => {
    const result = await createSchedule({ ...base, date: "2026-13-40", kind: "party" as never })
    expect(result).toMatchObject({ ok: false, fieldErrors: { date: expect.any(String), kind: expect.any(String) } })
    expect((await createSchedule({ ...base, startTime: "25:00" })).ok).toBe(false)
    expect((await createSchedule({ ...base, kind: "follow_up", endTime: "11:00" })).ok).toBe(false)
    expect(await createSchedule({ ...base, date: "2026-11-12" })).toMatchObject({ ok: false, fieldErrors: { date: "Pick today or a later date." } })
    expect(store.current.rows.size).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("stores Bali times in UTC, with a one hour default end", async () => {
    const { schedule } = only(await createSchedule(base))
    expect(schedule.startsAt).toBe("2026-11-20T02:00:00.000Z")
    expect(schedule.endsAt).toBe("2026-11-20T03:00:00.000Z")
    expect([schedule.day, schedule.startTime, schedule.endTime]).toEqual([NEXT_WEEK, "10:00", "11:00"])
    expect(schedule.title).toBe("Site survey: Pak Made")
  })

  it("assigns a Sales user's schedule to themselves and refuses anyone else", async () => {
    expect(only(await createSchedule(base)).schedule.salesId).toBe(SALES_A)
    const other = await createSchedule({ ...base, salesId: SALES_B })
    expect(other).toMatchObject({ ok: false, fieldErrors: { salesId: expect.stringMatching(/only schedule for yourself/) } })
  })

  it("refuses a lead the user cannot see", async () => {
    expect(await createSchedule({ ...base, leadId: 2 })).toMatchObject({ ok: false, message: expect.stringMatching(/no longer exists or is not assigned/) })
  })

  it("lets an Admin pick any salesperson, defaulting to the lead's", async () => {
    profile.current = { id: ADMIN, role: "Admin", name: "Owner" }
    store.current.visibleLeads = null
    expect(only(await createSchedule({ ...base, leadId: 2 })).schedule.salesId).toBe(SALES_B)
    expect(only(await createSchedule({ ...base, leadId: 2, salesId: SALES_A })).schedule.salesId).toBe(SALES_A)
    expect(only(await createSchedule({ ...base, leadId: 2, salesId: null })).schedule.salesId).toBeNull()
  })
})

describe("without Google or email keys", () => {
  it("saves, reports both as not connected or not requested, and calls nothing outside", async () => {
    const result = only(await createSchedule(base))
    expect(result.steps.google).toMatchObject({ status: "not_connected" })
    expect(result.steps.email).toMatchObject({ status: "not_requested" })
    expect(result.schedule.google.status).toBe("not_connected")
    expect(result.schedule.email.status).toBe("not_requested")
    expect(result.message).toMatch(/Google Calendar is not connected/)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith("/customers/1")
    expect(revalidatePath).toHaveBeenCalledWith("/leads")
    expect(revalidatePath).toHaveBeenCalledWith("/")
  })

  it("says the lead was not emailed when email is not connected", async () => {
    const result = only(await createSchedule({ ...base, notifyLead: true }))
    expect(result.steps.email.status).toBe("not_connected")
    expect(result.schedule.email).toMatchObject({ status: "not_connected", to: "made@example.com" })
    expect(result.message).not.toMatch(/emailed at/)
  })

  it("does not email a lead without a valid address, and records why", async () => {
    store.current.leads.get(1)!.email = "made at example"
    setEnv(EMAIL_ENV)
    const result = only(await createSchedule({ ...base, notifyLead: true }))
    expect(result.steps.email.status).toBe("no_address")
    expect(result.schedule.email.status).toBe("failed")
    expect(result.schedule.email.error).toMatch(/not valid/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("legacy date columns", () => {
  it("writes the matching column only, and moves it on reschedule", async () => {
    const first = only(await createSchedule(base))
    expect(first.steps.legacy).toMatchObject({ status: "updated", column: "site_survey", value: NEXT_WEEK })
    expect(store.current.leadWrites).toEqual([{ leadId: 1, column: "site_survey", value: NEXT_WEEK, updatedBy: SALES_A }])

    const moved = only(
      await rescheduleSchedule({ scheduleId: first.schedule.id, loadedUpdatedAt: first.schedule.updatedAt, date: "2026-11-24", startTime: "09:00" }),
    )
    expect(moved.steps.legacy).toMatchObject({ status: "updated", value: "2026-11-24" })
    expect(moved.schedule.previousStartsAt).toBe(first.schedule.startsAt)
    expect(moved.schedule.rescheduleCount).toBe(1)
  })

  it("keeps a later date typed by hand in the old CRM", async () => {
    store.current.leads.get(1)!.site_survey = "2026-12-01"
    const result = only(await createSchedule(base))
    expect(result.steps.legacy.status).toBe("kept_manual")
    expect(store.current.leads.get(1)!.site_survey).toBe("2026-12-01")
  })

  it("maps calls to appointment, clears on cancel and keeps the day on done", async () => {
    const call = only(await createSchedule({ ...base, kind: "call" }))
    expect(call.steps.legacy).toMatchObject({ column: "appointment", value: NEXT_WEEK })
    const cancelled = only(await cancelSchedule({ scheduleId: call.schedule.id, loadedUpdatedAt: call.schedule.updatedAt }))
    expect(cancelled.steps.legacy).toMatchObject({ status: "cleared", value: null })

    const visit = only(await createSchedule({ ...base, kind: "appointment" }))
    const done = only(await markScheduleDone({ scheduleId: visit.schedule.id, loadedUpdatedAt: visit.schedule.updatedAt }))
    expect(done.steps.legacy.status).toBe("unchanged")
    expect(store.current.leads.get(1)!.appointment).toBe(NEXT_WEEK)
    expect(done.steps.google.status).toBe("skipped")
  })
})

describe("stale and finished items", () => {
  it("refuses a reschedule from an old form and changes nothing", async () => {
    const { schedule } = only(await createSchedule(base))
    const result = await rescheduleSchedule({ scheduleId: schedule.id, loadedUpdatedAt: "2026-01-01T00:00:00Z", date: "2026-11-25", startTime: "09:00" })
    expect(result).toMatchObject({ ok: false, stale: true })
    expect(store.current.rows.get(schedule.id)!.starts_at).toBe(schedule.startsAt)
  })

  it("refuses to cancel twice", async () => {
    const { schedule } = only(await createSchedule(base))
    const cancelled = only(await cancelSchedule({ scheduleId: schedule.id, loadedUpdatedAt: schedule.updatedAt }))
    expect(await cancelSchedule({ scheduleId: schedule.id, loadedUpdatedAt: cancelled.schedule.updatedAt })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/already cancelled/),
    })
  })
})

describe("Google Calendar", () => {
  it("creates the event with a stable id, Bali time zone and no attendees", async () => {
    setEnv(GOOGLE_ENV)
    useFetch(googleToken, (c) => (c.method === "POST" && c.url.includes("/events") ? { status: 200, body: { id: "evt" } } : undefined))
    const result = only(await createSchedule(base))
    expect(result.steps.google.status).toBe("synced")
    expect(result.schedule.google.status).toBe("synced")
    const insert = calls.find((c) => c.url.includes("/events"))!
    const body = insert.body as Record<string, unknown> & { start: unknown; extendedProperties: unknown }
    expect(body.id).toBe(result.schedule.id.replace(/-/g, ""))
    expect(body).not.toHaveProperty("attendees")
    expect(body.start).toEqual({ dateTime: "2026-11-20T02:00:00.000Z", timeZone: "Asia/Makassar" })
    expect(body.extendedProperties).toEqual({ private: { crmScheduleId: result.schedule.id } })
    expect(String(body.description)).toContain("https://crm.example.test/customers/1")
    expect(String(body.description)).toContain("Salesperson: Ayu")
  })

  it("updates the existing event when Google already has it (retry after a timeout)", async () => {
    setEnv(GOOGLE_ENV)
    useFetch(googleToken, (c) =>
      c.method === "POST" && c.url.includes("/events") ? { status: 409, body: { error: { message: "duplicate" } } } : undefined,
    (c) => (c.method === "PATCH" ? { status: 200, body: { id: "x" } } : undefined))
    expect(only(await createSchedule(base)).steps.google.status).toBe("synced")
    expect(calls.map((c) => c.method)).toEqual(["POST", "POST", "PATCH"])
  })

  it("records a failure on the row and in automation_events, and never says synced", async () => {
    setEnv(GOOGLE_ENV)
    useFetch(googleToken, (c) => (c.url.includes("/events") ? { status: 403, body: { error: { message: "Forbidden", errors: [{ reason: "requiredAccessLevel" }] } } } : undefined))
    const result = only(await createSchedule(base))
    expect(result.steps.google.status).toBe("failed")
    expect(result.schedule.google).toMatchObject({ status: "failed", error: expect.stringMatching(/Make changes to events/) })
    expect(result.message).toMatch(/Google Calendar was not updated/)
    expect(store.current.events).toMatchObject([{ type: "schedule_google_failed", leadId: 1, scheduleId: result.schedule.id, actorSalesId: SALES_A }])
  })

  it("removes the event on cancel", async () => {
    setEnv(GOOGLE_ENV)
    useFetch(
      googleToken,
      (c) => (c.method === "POST" && c.url.includes("/events") ? { status: 200, body: { id: "evt1" } } : undefined),
      (c) => (c.method === "DELETE" ? { status: 204 } : undefined),
    )
    const { schedule } = only(await createSchedule(base))
    const result = only(await cancelSchedule({ scheduleId: schedule.id, loadedUpdatedAt: schedule.updatedAt }))
    expect(result.steps.google.status).toBe("removed")
    expect(calls.at(-1)!.url).toMatch(/\/events\/evt1$/)
  })

  it("says an event could not be removed when Google is no longer connected", async () => {
    const { schedule } = only(await createSchedule(base))
    store.current.rows.get(schedule.id)!.google_event_id = "evt-old"
    const result = only(await cancelSchedule({ scheduleId: schedule.id, loadedUpdatedAt: store.current.rows.get(schedule.id)!.updated_at }))
    expect(result.steps.google).toMatchObject({ status: "failed", message: expect.stringMatching(/Remove it by hand/) })
    expect(store.current.events[0].type).toBe("schedule_google_failed")
  })
})

describe("email to the lead", () => {
  const resendOk: Route = (c) => (c.url === "https://api.resend.com/emails" ? { status: 200, body: { id: `msg_${calls.length}` } } : undefined)

  function attachment(call: Call) {
    const body = call.body as { attachments: Array<{ content: string; content_type: string; filename: string }> }
    return { ...body.attachments[0], ics: Buffer.from(body.attachments[0].content, "base64").toString("utf8") }
  }

  it("sends a bilingual email with a REQUEST calendar file and records it", async () => {
    setEnv(EMAIL_ENV)
    useFetch(resendOk)
    const result = only(await createSchedule({ ...base, notifyLead: true, location: "Jl. Raya Ubud 1" }))
    expect(result.steps.email).toMatchObject({ status: "sent", message: "The lead was emailed at made@example.com." })
    expect(result.schedule.email).toMatchObject({ status: "sent", to: "made@example.com" })
    expect(store.current.rows.get(result.schedule.id)!.email_message_id).toBe("msg_1")

    const call = calls[0]
    expect(call.headers.authorization).toBe("Bearer re_test_SECRET_123456")
    expect(call.headers["idempotency-key"]).toBe(`schedule-${result.schedule.id}-0-REQUEST`)
    const body = call.body as { to: string[]; reply_to: string; subject: string; text: string }
    expect(body.to).toEqual(["made@example.com"])
    expect(body.reply_to).toBe("hello@fsi.example")
    expect(body.text).toContain("When: Friday 20 November 2026, 10:00 to 11:00 WITA")
    expect(body.text).toContain("Survei lokasi")
    expect(body.text).toContain("Where: Jl. Raya Ubud 1")
    const file = attachment(call)
    expect(file.content_type).toBe("text/calendar; charset=utf-8; method=REQUEST")
    expect(file.ics).toContain("METHOD:REQUEST\r\n")
    expect(file.ics).toContain(`UID:${result.schedule.id}@fsi-crm\r\n`)
    expect(file.ics).toContain("DTSTART:20261120T020000Z\r\n")
  })

  it("records a failed send and logs it for review", async () => {
    setEnv(EMAIL_ENV)
    useFetch((c) => (c.url.endsWith("/emails") ? { status: 403, body: { name: "validation_error", message: "The fsi.example domain is not verified." } } : undefined))
    const result = only(await createSchedule({ ...base, notifyLead: true }))
    expect(result.steps.email.status).toBe("failed")
    expect(result.schedule.email).toMatchObject({ status: "failed", error: expect.stringMatching(/not verified/) })
    expect(store.current.events).toMatchObject([{ type: "schedule_email_failed" }])
    expect(JSON.stringify(result)).not.toContain("re_test_SECRET")
  })

  it("sends the new time with a higher SEQUENCE, then a CANCEL", async () => {
    setEnv(EMAIL_ENV)
    useFetch(resendOk)
    const first = only(await createSchedule({ ...base, notifyLead: true }))
    const moved = only(
      await rescheduleSchedule({ scheduleId: first.schedule.id, loadedUpdatedAt: first.schedule.updatedAt, date: "2026-11-21", startTime: "14:30" }),
    )
    expect(moved.steps.email.status).toBe("sent")
    expect(attachment(calls[1]).ics).toContain("SEQUENCE:1\r\n")
    expect((calls[1].body as { subject: string }).subject).toMatch(/^New time:/)

    const cancelled = only(await cancelSchedule({ scheduleId: first.schedule.id, loadedUpdatedAt: moved.schedule.updatedAt }))
    expect(cancelled.steps.email.status).toBe("sent")
    const file = attachment(calls[2])
    expect(file.content_type).toContain("method=CANCEL")
    expect(file.ics).toContain("METHOD:CANCEL\r\n")
    expect(file.ics).toContain("STATUS:CANCELLED\r\n")
    expect(file.ics).toContain("SEQUENCE:2\r\n")
    expect(file.ics).toContain(`UID:${first.schedule.id}@fsi-crm\r\n`)
  })

  it("does not send a cancellation to a lead who never got the invitation", async () => {
    setEnv(EMAIL_ENV)
    const { schedule } = only(await createSchedule(base))
    const result = only(await cancelSchedule({ scheduleId: schedule.id, loadedUpdatedAt: schedule.updatedAt }))
    expect(result.steps.email.status).toBe("not_requested")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("reports an outcome it could not record instead of hiding it", async () => {
    setEnv(EMAIL_ENV)
    useFetch(resendOk)
    store.current.failRecord = true
    const result = only(await createSchedule({ ...base, notifyLead: true }))
    expect(result.steps.email.status).toBe("sent")
    expect(result.recordError).toMatch(/could not be saved/)
  })
})

describe("deleting a lead", () => {
  it("cancels its schedules and removes their Google events first", async () => {
    setEnv(GOOGLE_ENV)
    useFetch(
      googleToken,
      (c) => (c.method === "POST" && c.url.includes("/events") ? { status: 200, body: { id: "evt9" } } : undefined),
      (c) => (c.method === "DELETE" ? { status: 410 } : undefined),
    )
    only(await createSchedule(base))
    only(await createSchedule({ ...base, kind: "call" }))
    const { userScheduleDeps } = await import("./deps")
    const summary = await cancelSchedulesBeforeLeadDelete(await userScheduleDeps(), 1)
    expect(summary).toEqual({ cancelled: 2, googleFailures: 0, error: null })
    expect([...store.current.rows.values()].every((row) => row.status === "cancelled")).toBe(true)
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(2)
  })
})
