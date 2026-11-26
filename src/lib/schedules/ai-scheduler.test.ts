import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { createAiScheduler } from "./ai-scheduler"
import type { GoogleBusy } from "./free-busy"
import { confirmScheduleCore, type ScheduleDeps } from "./service"
import { FakeScheduleStore } from "./testing"
import { witaToUtc } from "./time"
import { toScheduleView } from "./view"

const SALES_A = "10000000-0000-4000-8000-00000000000a"
const SALES_B = "10000000-0000-4000-8000-00000000000b"
// Monday 16 November 2026, 08:00 WITA.
const NOW = new Date("2026-11-16T00:00:00Z")
// Email keys are set on purpose: the assistant must still never email the lead.
const EMAIL_ENV = { RESEND_API_KEY: "re_test_123456", EMAIL_FROM: "FSI <crm@fsi.example>" }

function setup(google: GoogleBusy = { state: "not_connected" }) {
  const store = new FakeScheduleStore()
  store.addLead({ id: 1, customer_name: "Made", email: "made@example.com", sales_id: SALES_A })
  store.addLead({ id: 2, customer_name: "Ketut", sales_id: SALES_A })
  const fetchFn = vi.fn(async () => {
    throw new Error("no network in tests")
  })
  const googleBusy = vi.fn(async () => google)
  const schedule: ScheduleDeps = {
    store,
    actor: { id: null, admin: true },
    env: EMAIL_ENV,
    fetchFn,
    now: () => NOW,
    baseUrl: null,
    bookedVia: "whatsapp_ai",
  }
  const scheduler = createAiScheduler({ schedule, googleBusy, ready: async () => true })
  return { store, fetchFn, googleBusy, scheduler, schedule }
}

const ids = { leadId: 1, conversationId: "conv-1", salesId: SALES_A, timeZone: "Asia/Makassar" as const }

async function staffItem(store: FakeScheduleStore, day: string, from: string, to: string, salesId = SALES_A, leadId = 2) {
  return store.insert({
    lead_id: leadId,
    sales_id: salesId,
    kind: "appointment",
    title: "Staff appointment",
    starts_at: witaToUtc(day, from),
    ends_at: witaToUtc(day, to),
    created_by: salesId,
  })
}

describe("AI availability", () => {
  it("leaves out the salesperson's own scheduled items but not other salespeople's", async () => {
    const { store, scheduler } = setup()
    await staffItem(store, "2026-11-17", "09:00", "10:00")
    await staffItem(store, "2026-11-17", "10:00", "11:00", SALES_B)
    const cancelled = await staffItem(store, "2026-11-17", "11:00", "12:00")
    await store.update(cancelled.id, { status: "cancelled" })

    const result = await scheduler.availability({ ...ids, kind: "appointment", fromDay: "2026-11-17" })
    expect(result).toEqual({
      ok: true,
      slots: [
        { date: "2026-11-17", startTime: "10:00", endTime: "11:00", label: "Tue 17 Nov, 10:00 to 11:00 WITA", zoneLabel: "WITA" },
        { date: "2026-11-17", startTime: "11:00", endTime: "12:00", label: "Tue 17 Nov, 11:00 to 12:00 WITA", zoneLabel: "WITA" },
        { date: "2026-11-17", startTime: "12:00", endTime: "13:00", label: "Tue 17 Nov, 12:00 to 13:00 WITA", zoneLabel: "WITA" },
      ],
    })
  })

  it("leaves out the shared Google Calendar's busy times", async () => {
    const busy = [{ start: Date.parse(witaToUtc("2026-11-17", "09:00")), end: Date.parse(witaToUtc("2026-11-17", "11:00")) }]
    const { scheduler, googleBusy } = setup({ state: "ok", busy })
    const result = await scheduler.availability({ ...ids, kind: "call", fromDay: "2026-11-17" })
    expect(result.ok && result.slots.map((s) => s.startTime)).toEqual(["11:00", "12:00", "13:00"])
    expect(googleBusy).toHaveBeenCalledWith(witaToUtc("2026-11-17", "09:00"), witaToUtc("2026-11-23", "17:00"))
  })

  it("offers nothing when Google is connected but cannot be read, and logs it for review", async () => {
    const { scheduler, store } = setup({ state: "failed", message: "Google is limiting requests right now." })
    const result = await scheduler.availability({ ...ids, kind: "call", fromDay: "2026-11-17" })
    expect(result).toMatchObject({ ok: false })
    expect(store.events).toEqual([
      expect.objectContaining({ type: "schedule_ai_check_failed", leadId: 1, conversationId: "conv-1", needsReview: true }),
    ])
  })
})

describe("AI booking", () => {
  it("books through the shared create step: AI marker, unconfirmed, legacy date, no email", async () => {
    const { scheduler, store, fetchFn } = setup()
    const result = await scheduler.book({ ...ids, kind: "site_survey", date: "2026-11-17", startTime: "10:00", location: "Ubud", customerName: "Made" })

    expect(result).toMatchObject({
      ok: true,
      booking: { kind: "site_survey", date: "2026-11-17", startTime: "10:00", endTime: "12:00", bookedByAi: true, confirmed: false },
    })
    const row = [...store.rows.values()][0]
    expect(row).toMatchObject({
      booked_via: "whatsapp_ai",
      confirmed_at: null,
      created_by: null,
      sales_id: SALES_A,
      notify_lead: false,
      email_status: "not_requested",
      location: "Ubud",
    })
    expect(store.leads.get(1)?.site_survey).toBe("2026-11-17")
    expect(store.leadWrites).toEqual([{ leadId: 1, column: "site_survey", value: "2026-11-17", updatedBy: null }])
    expect(fetchFn).not.toHaveBeenCalled()
    expect(store.events.at(-1)).toMatchObject({ type: "schedule_ai_booked", needsReview: false, severity: "info" })
  })

  it("refuses a slot taken between the check and the booking, and offers others", async () => {
    const { scheduler, store } = setup()
    const before = await scheduler.availability({ ...ids, kind: "call", fromDay: "2026-11-17" })
    expect(before.ok && before.slots[0].startTime).toBe("09:00")

    await staffItem(store, "2026-11-17", "09:00", "10:00")
    const result = await scheduler.book({ ...ids, kind: "call", date: "2026-11-17", startTime: "09:00", customerName: null })

    expect(result).toMatchObject({ ok: false, reason: "slot_taken" })
    expect(result.ok === false && result.reason === "slot_taken" && result.alternatives.map((s) => s.startTime)).not.toContain("09:00")
    expect([...store.rows.values()].filter((r) => r.booked_via === "whatsapp_ai")).toHaveLength(0)
  })

  it("re-checks Google at booking time", async () => {
    const busy = [{ start: Date.parse(witaToUtc("2026-11-17", "09:00")), end: Date.parse(witaToUtc("2026-11-17", "09:30")) }]
    const { scheduler, store } = setup({ state: "ok", busy })
    const result = await scheduler.book({ ...ids, kind: "call", date: "2026-11-17", startTime: "09:00", customerName: null })
    expect(result).toMatchObject({ ok: false, reason: "slot_taken" })
    expect(store.rows.size).toBe(0)
  })

  it("refuses past, too-soon and out-of-hours times without saving", async () => {
    const { scheduler, store } = setup()
    const book = (date: string, startTime: string) => scheduler.book({ ...ids, kind: "call", date, startTime, customerName: null })
    expect(await book("2026-11-13", "10:00")).toMatchObject({ reason: "rules", problem: "too_soon" })
    expect(await book("2026-11-16", "11:00")).toMatchObject({ reason: "rules", problem: "too_soon" })
    expect(await book("2026-11-17", "18:00")).toMatchObject({ reason: "rules", problem: "outside_hours" })
    expect(store.rows.size).toBe(0)
  })

  it("moves its own booking, which then needs confirming again; cancels without emailing", async () => {
    const { scheduler, store, fetchFn } = setup()
    const booked = await scheduler.book({ ...ids, kind: "call", date: "2026-11-17", startTime: "09:00", customerName: null })
    if (!booked.ok) throw new Error("not booked")

    const confirmed = await confirmScheduleCore(
      { store, actor: { id: SALES_A, admin: false }, env: {}, fetchFn, now: () => NOW, baseUrl: null },
      { scheduleId: booked.booking.id, loadedUpdatedAt: booked.booking.updatedAt },
    )
    expect(confirmed).toMatchObject({ ok: true, schedule: { bookedBy: "ai", confirmedBy: SALES_A, needsConfirmation: false } })

    const [current] = await scheduler.upcoming(1)
    expect(current.confirmed).toBe(true)
    const moved = await scheduler.reschedule({ ...ids, booking: current, date: "2026-11-18", startTime: "10:00" })
    expect(moved).toMatchObject({ ok: true, booking: { date: "2026-11-18", startTime: "10:00", confirmed: false } })
    expect(store.rows.get(booked.booking.id)).toMatchObject({ confirmed_at: null, confirmed_by: null, reschedule_count: 1 })

    const [again] = await scheduler.upcoming(1)
    expect(await scheduler.cancel({ ...ids, booking: again })).toEqual({ ok: true })
    expect(store.rows.get(booked.booking.id)?.status).toBe("cancelled")
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe("confirmScheduleCore", () => {
  it("refuses staff items and stale loads", async () => {
    const { store, fetchFn, scheduler } = setup()
    const staff = await staffItem(store, "2026-11-17", "09:00", "10:00", SALES_A, 1)
    const deps: ScheduleDeps = { store, actor: { id: SALES_A, admin: false }, env: {}, fetchFn, now: () => NOW, baseUrl: null }
    expect(await confirmScheduleCore(deps, { scheduleId: staff.id, loadedUpdatedAt: staff.updated_at })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/only items booked by the assistant/),
    })

    const booked = await scheduler.book({ ...ids, kind: "call", date: "2026-11-18", startTime: "09:00", customerName: null })
    if (!booked.ok) throw new Error("not booked")
    expect(await confirmScheduleCore(deps, { scheduleId: booked.booking.id, loadedUpdatedAt: "2026-01-01T00:00:00Z" })).toMatchObject({
      ok: false,
      stale: true,
    })
  })
})

describe("AI scheduling in the customer's zone", () => {
  const WIB = { ...ids, timeZone: "Asia/Jakarta" as const }

  it("offers 09:00 to 17:00 in the customer's own time: a WIB customer can get 16:00 WIB (17:00 in Bali)", async () => {
    const { scheduler, store } = setup()
    const first = await scheduler.availability({ ...WIB, kind: "call", fromDay: "2026-11-17" })
    expect(first).toEqual({
      ok: true,
      slots: [
        { date: "2026-11-17", startTime: "09:00", endTime: "09:30", label: "Tue 17 Nov, 09:00 to 09:30 WIB", zoneLabel: "WIB" },
        { date: "2026-11-17", startTime: "10:00", endTime: "10:30", label: "Tue 17 Nov, 10:00 to 10:30 WIB", zoneLabel: "WIB" },
        { date: "2026-11-17", startTime: "11:00", endTime: "11:30", label: "Tue 17 Nov, 11:00 to 11:30 WIB", zoneLabel: "WIB" },
      ],
    })
    const late = await scheduler.availability({ ...WIB, kind: "call", fromDay: "2026-11-17", preferredTime: "16:30" })
    // The latest call that ends by 17:00 WIB starts at 16:00 WIB.
    expect(late.ok && late.slots.map((s) => s.startTime)).toEqual(["14:00", "15:00", "16:00"])

    const booked = await scheduler.book({ ...WIB, kind: "call", date: "2026-11-17", startTime: "16:00", customerName: null })
    expect(booked).toMatchObject({ ok: true, booking: { timeZone: "Asia/Jakarta", zoneLabel: "WIB", startTime: "16:00", label: "Tue 17 Nov, 16:00 to 16:30 WIB" } })
    // 16:00 WIB is 17:00 in Bali: outside Bali's hours, inside the customer's.
    expect([...store.rows.values()][0]).toMatchObject({ time_zone: "Asia/Jakarta", starts_at: "2026-11-17T09:00:00.000Z" })
    expect(toScheduleView([...store.rows.values()][0])).toMatchObject({ startTime: "16:00", officeStartTime: "17:00" })
  })

  it("refuses a time outside the customer's hours even when it is inside Bali's", async () => {
    const { scheduler } = setup()
    // 08:30 WIB is 09:30 in Bali.
    const result = await scheduler.book({ ...WIB, kind: "call", date: "2026-11-17", startTime: "08:30", customerName: null })
    expect(result).toEqual({ ok: false, reason: "rules", problem: "outside_hours" })
  })

  it("sees a WITA booking and a WIB request for the same salesperson as the same moment", async () => {
    const { store, scheduler } = setup()
    // Staff booked 10:00 to 11:00 WITA (02:00 to 03:00 UTC) for this salesperson.
    await staffItem(store, "2026-11-17", "10:00", "11:00")
    // 09:00 WIB is 02:00 UTC: taken. 10:00 WIB is 03:00 UTC: free.
    const taken = await scheduler.book({ ...WIB, kind: "call", date: "2026-11-17", startTime: "09:00", customerName: null })
    expect(taken).toMatchObject({ ok: false, reason: "slot_taken" })
    const offered = await scheduler.availability({ ...WIB, kind: "call", fromDay: "2026-11-17" })
    expect(offered.ok && offered.slots.map((s) => s.startTime)).toEqual(["10:00", "11:00", "12:00"])
    const free = await scheduler.book({ ...WIB, kind: "call", date: "2026-11-17", startTime: "10:00", customerName: null })
    expect(free).toMatchObject({ ok: true, booking: { startTime: "10:00", zoneLabel: "WIB" } })
    expect([...store.rows.values()].find((r) => r.booked_via)).toMatchObject({ time_zone: "Asia/Jakarta", starts_at: "2026-11-17T03:00:00.000Z" })
  })

  it("moves a booking in its own zone", async () => {
    const { scheduler } = setup()
    const booked = await scheduler.book({ ...WIB, kind: "call", date: "2026-11-17", startTime: "10:00", customerName: null })
    if (!booked.ok) throw new Error("not booked")
    // The salesperson's zone is not passed: the booking keeps WIB.
    const moved = await scheduler.reschedule({ ...ids, booking: booked.booking, date: "2026-11-18", startTime: "16:00" })
    expect(moved).toMatchObject({ ok: true, booking: { timeZone: "Asia/Jakarta", label: "Wed 18 Nov, 16:00 to 16:30 WIB" } })
  })

  it("finds the zone from the chat's answer first, then the lead's location", async () => {
    const { store, scheduler } = setup()
    store.leads.get(1)!.location = "Sorong"
    expect(await scheduler.customerZone({ leadId: 1, answeredLocation: "Surabaya" })).toMatchObject({ zone: "Asia/Jakarta", confident: true, source: "answer" })
    expect(await scheduler.customerZone({ leadId: 1, answeredLocation: "zen villa" })).toMatchObject({ zone: "Asia/Jayapura", confident: true, source: "lead" })
    store.leads.get(1)!.location = "-"
    expect(await scheduler.customerZone({ leadId: 1, answeredLocation: null })).toEqual({ zone: "Asia/Makassar", confident: false, source: null })
    expect(await scheduler.customerZone({ leadId: 1, answeredLocation: "jakarta, bali" })).toEqual({ zone: "Asia/Jakarta", confident: false, source: null })
  })
})
