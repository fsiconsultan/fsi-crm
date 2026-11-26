import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { mergeScheduled } from "@/components/dashboard/schedule"
import { clearTokenCache, eventBody } from "@/lib/integrations/google-calendar"
import { leadEmail } from "./email-content"
import { buildIcs } from "./ics"
import { decideLegacyDate } from "./legacy"
import { createScheduleCore, rescheduleScheduleCore, type ScheduleDeps } from "./service"
import { FakeScheduleStore } from "./testing"
import { localDay, localTime, toUtc, whenEnglish, whenIndonesian } from "./time"
import type { ScheduleActionResult, ScheduleView } from "./types"
import { validateTiming, type FieldErrors } from "./validate"
import { toScheduleView } from "./view"

const ADMIN = "10000000-0000-4000-8000-00000000000c"
// Friday 13 November 2026, 10:00 WITA.
const NOW = new Date("2026-11-13T02:00:00Z")

function setup(now = NOW, env: Record<string, string> = {}, fetchFn: ScheduleDeps["fetchFn"] = async () => {
  throw new Error("no network in tests")
}) {
  const store = new FakeScheduleStore()
  store.addLead({ id: 1, customer_name: "Budi", location: "Surabaya" })
  store.addLead({ id: 2, customer_name: "Made", location: "Canggu, Bali" })
  store.addLead({ id: 3, customer_name: "Yohanes", location: "Sorong" })
  store.addLead({ id: 4, customer_name: "Zen", location: "zen villa" })
  const deps: ScheduleDeps = { store, actor: { id: ADMIN, admin: true }, env, fetchFn, now: () => now, baseUrl: null }
  return { store, deps }
}

function saved(result: ScheduleActionResult): ScheduleView {
  if (!result.ok) throw new Error(`expected ok, got: ${result.message} ${JSON.stringify(result.fieldErrors)}`)
  return result.schedule
}

describe("UTC conversion per zone", () => {
  it("reads the same wall time in each zone", () => {
    expect(toUtc("2026-11-20", "10:00", "Asia/Jakarta")).toBe("2026-11-20T03:00:00.000Z")
    expect(toUtc("2026-11-20", "10:00", "Asia/Makassar")).toBe("2026-11-20T02:00:00.000Z")
    expect(toUtc("2026-11-20", "10:00", "Asia/Jayapura")).toBe("2026-11-20T01:00:00.000Z")
    expect(localTime("2026-11-20T03:00:00.000Z", "Asia/Jakarta")).toBe("10:00")
    expect(localTime("2026-11-20T03:00:00.000Z", "Asia/Makassar")).toBe("11:00")
    expect(localDay("2026-11-19T15:30:00.000Z", "Asia/Jayapura")).toBe("2026-11-20")
    expect(localDay("2026-11-19T15:30:00.000Z", "Asia/Makassar")).toBe("2026-11-19")
  })
})

describe("creating in the customer's zone", () => {
  it("defaults the zone from the lead's location and shows both local and office times", async () => {
    const { deps, store } = setup()
    const view = saved(await createScheduleCore(deps, { leadId: 1, kind: "appointment", date: "2026-11-20", startTime: "10:00" }))
    expect(view).toMatchObject({
      timeZone: "Asia/Jakarta",
      zoneLabel: "WIB",
      startsAt: "2026-11-20T03:00:00.000Z",
      day: "2026-11-20",
      startTime: "10:00",
      endTime: "11:00",
      officeDay: "2026-11-20",
      officeStartTime: "11:00",
      officeEndTime: "12:00",
    })
    expect([...store.rows.values()][0].time_zone).toBe("Asia/Jakarta")
  })

  it("keeps Bali time for a Bali lead and for an unknown location, without sending the column", async () => {
    const { deps, store } = setup()
    const insert = vi.spyOn(store, "insert")
    const bali = saved(await createScheduleCore(deps, { leadId: 2, kind: "call", date: "2026-11-20", startTime: "10:00" }))
    const unknown = saved(await createScheduleCore(deps, { leadId: 4, kind: "call", date: "2026-11-20", startTime: "10:00" }))
    for (const view of [bali, unknown]) {
      expect(view).toMatchObject({ timeZone: "Asia/Makassar", zoneLabel: "WITA", startTime: "10:00", officeStartTime: "10:00" })
    }
    expect(insert.mock.calls.every(([row]) => !("time_zone" in row))).toBe(true)
  })

  it("lets staff override the zone, and refuses a zone that is not one of the three", async () => {
    const { deps } = setup()
    const wit = saved(await createScheduleCore(deps, { leadId: 1, kind: "call", date: "2026-11-20", startTime: "10:00", timeZone: "Asia/Jayapura" }))
    expect(wit).toMatchObject({ timeZone: "Asia/Jayapura", zoneLabel: "WIT", startsAt: "2026-11-20T01:00:00.000Z", officeStartTime: "09:00" })

    const bad = await createScheduleCore(deps, { leadId: 1, kind: "call", date: "2026-11-20", startTime: "10:00", timeZone: "Europe/Paris" })
    expect(bad).toMatchObject({ ok: false, fieldErrors: { timeZone: "Choose WIB, WITA or WIT." } })
  })

  it("puts a booking near midnight on a different office day", async () => {
    const { deps } = setup()
    const wit = saved(await createScheduleCore(deps, { leadId: 3, kind: "call", date: "2026-11-20", startTime: "00:30" }))
    expect(wit).toMatchObject({
      timeZone: "Asia/Jayapura",
      startsAt: "2026-11-19T15:30:00.000Z",
      day: "2026-11-20",
      startTime: "00:30",
      officeDay: "2026-11-19",
      officeStartTime: "23:30",
    })
    const wib = saved(await createScheduleCore(deps, { leadId: 1, kind: "follow_up", date: "2026-11-20", startTime: "23:30" }))
    expect(wib).toMatchObject({ day: "2026-11-20", startTime: "23:30", endTime: null, officeDay: "2026-11-21", officeStartTime: "00:30" })
  })

  it("keeps an all-day item on its own day for staff too", async () => {
    const { deps } = setup()
    const view = saved(await createScheduleCore(deps, { leadId: 3, kind: "site_survey", date: "2026-11-20", allDay: true }))
    expect(view).toMatchObject({ startsAt: "2026-11-19T15:00:00.000Z", day: "2026-11-20", officeDay: "2026-11-20", startTime: null, officeStartTime: null })
  })

  it("mirrors the booking's local day into the old CRM's column", async () => {
    const { deps, store } = setup()
    await createScheduleCore(deps, { leadId: 3, kind: "appointment", date: "2026-11-20", startTime: "00:30" })
    expect(store.leadWrites).toEqual([expect.objectContaining({ leadId: 3, column: "appointment", value: "2026-11-20" })])
    expect(
      decideLegacyDate(null, [{ status: "scheduled", starts_at: "2026-11-19T15:30:00.000Z", previous_starts_at: null, time_zone: "Asia/Jayapura" }], "2026-11-13"),
    ).toEqual({ action: "set", value: "2026-11-20" })
  })
})

describe("today or later, in the booking's zone", () => {
  // 16:30 UTC: already Saturday 14 Nov 00:30 in Bali, still Friday 13 Nov 23:30 in Jakarta.
  const LATE = new Date("2026-11-13T16:30:00Z")

  it("validateTiming uses the zone's own today", () => {
    const errors: FieldErrors = {}
    expect(validateTiming("follow_up", { date: "2026-11-13", startTime: "23:45" }, localDay(LATE, "Asia/Jakarta"), errors, "Asia/Jakarta")).toEqual({
      startsAt: "2026-11-13T16:45:00.000Z",
      endsAt: null,
      allDay: false,
    })
    expect(errors).toEqual({})
    validateTiming("follow_up", { date: "2026-11-13", startTime: "23:45" }, localDay(LATE, "Asia/Makassar"), errors, "Asia/Makassar")
    expect(errors.date).toMatch(/today or a later date/)
  })

  it("accepts the Jakarta customer's today and refuses the same date for a Bali customer", async () => {
    const { deps } = setup(LATE)
    const wib = await createScheduleCore(deps, { leadId: 1, kind: "follow_up", date: "2026-11-13", startTime: "23:45" })
    expect(wib).toMatchObject({ ok: true, schedule: { timeZone: "Asia/Jakarta", day: "2026-11-13", officeDay: "2026-11-14" } })
    const wita = await createScheduleCore(deps, { leadId: 2, kind: "follow_up", date: "2026-11-13", startTime: "23:45" })
    expect(wita).toMatchObject({ ok: false, fieldErrors: { date: expect.stringMatching(/today or a later date/) } })
  })
})

describe("rescheduling", () => {
  it("keeps the booking's zone unless a new one is given", async () => {
    const { deps, store } = setup()
    const first = saved(await createScheduleCore(deps, { leadId: 1, kind: "call", date: "2026-11-20", startTime: "10:00" }))

    const moved = saved(await rescheduleScheduleCore(deps, { scheduleId: first.id, loadedUpdatedAt: first.updatedAt, date: "2026-11-21", startTime: "14:00" }))
    expect(moved).toMatchObject({ timeZone: "Asia/Jakarta", day: "2026-11-21", startTime: "14:00", startsAt: "2026-11-21T07:00:00.000Z", officeStartTime: "15:00" })

    const update = vi.spyOn(store, "updateIfUnchanged")
    const again = saved(
      await rescheduleScheduleCore(deps, { scheduleId: moved.id, loadedUpdatedAt: moved.updatedAt, date: "2026-11-21", startTime: "14:00", timeZone: "Asia/Makassar" }),
    )
    expect(again).toMatchObject({ timeZone: "Asia/Makassar", zoneLabel: "WITA", startsAt: "2026-11-21T06:00:00.000Z", startTime: "14:00" })
    expect(update.mock.calls[0][2]).toMatchObject({ time_zone: "Asia/Makassar" })
  })

  it("refuses the same time in the same zone", async () => {
    const { deps } = setup()
    const first = saved(await createScheduleCore(deps, { leadId: 1, kind: "call", date: "2026-11-20", startTime: "10:00" }))
    const same = await rescheduleScheduleCore(deps, { scheduleId: first.id, loadedUpdatedAt: first.updatedAt, date: "2026-11-20", startTime: "10:00" })
    expect(same).toMatchObject({ ok: false, message: expect.stringMatching(/already has/) })
  })
})

describe("Google Calendar and the email use the booking's zone", () => {
  it("builds the event in the booking's zone, and all-day dates on its local day", () => {
    const base = { scheduleId: "00000000-0000-4000-8000-000000000001", title: "Call", description: "", location: null }
    const timed = eventBody({ ...base, startsAt: "2026-11-20T03:00:00.000Z", endsAt: "2026-11-20T04:00:00.000Z", allDay: false, timeZone: "Asia/Jakarta" })
    expect(timed.start).toEqual({ dateTime: "2026-11-20T03:00:00.000Z", timeZone: "Asia/Jakarta" })
    expect(timed.end).toEqual({ dateTime: "2026-11-20T04:00:00.000Z", timeZone: "Asia/Jakarta" })
    const allDay = eventBody({ ...base, startsAt: "2026-11-19T15:00:00.000Z", endsAt: "2026-11-20T15:00:00.000Z", allDay: true, timeZone: "Asia/Jayapura" })
    expect(allDay.start).toEqual({ date: "2026-11-20" })
    expect(allDay.end).toEqual({ date: "2026-11-21" })
    expect(eventBody({ ...base, startsAt: "2026-11-20T02:00:00.000Z", endsAt: null, allDay: false }).start).toEqual({
      dateTime: "2026-11-20T02:00:00.000Z",
      timeZone: "Asia/Makassar",
    })
  })

  it("sends the booking's zone to Google from the service", async () => {
    clearTokenCache()
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const env = {
      GOOGLE_CALENDAR_ID: "fsi@group.calendar.google.com",
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "crm@fsi.iam.gserviceaccount.com",
        private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      }),
    }
    const bodies: unknown[] = []
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2.googleapis.com/token")) return Response.json({ access_token: "ya29.t", expires_in: 3600 })
      bodies.push(JSON.parse(String(init?.body)))
      return Response.json({ id: "evt" })
    })
    const { deps } = setup(NOW, env, fetchFn)
    const result = await createScheduleCore(deps, { leadId: 3, kind: "call", date: "2026-11-20", startTime: "10:00" })
    expect(result).toMatchObject({ ok: true, steps: { google: { status: "synced" } } })
    expect(bodies[0]).toMatchObject({ start: { dateTime: "2026-11-20T01:00:00.000Z", timeZone: "Asia/Jayapura" } })
    clearTokenCache()
  })

  it("writes the customer's local time with its label, in English and Indonesian", () => {
    const when = { startsAt: "2026-11-20T03:00:00.000Z", endsAt: "2026-11-20T04:00:00.000Z", allDay: false }
    expect(whenEnglish(when, "Asia/Jakarta")).toBe("Friday 20 November 2026, 10:00 to 11:00 WIB")
    expect(whenIndonesian(when, "Asia/Jakarta")).toBe("Jumat, 20 November 2026, pukul 10.00 sampai 11.00 WIB")
    const email = leadEmail({
      purpose: "new",
      kind: "appointment",
      when,
      timeZone: "Asia/Jakarta",
      location: null,
      customerName: "Budi",
      salesName: "Ayu",
      contactEmail: "hello@fsi.example",
    })
    expect(email.subject).toBe("Appointment with French Solar Industry, Fri 20 Nov, 10:00 WIB")
    expect(email.text).toContain("When: Friday 20 November 2026, 10:00 to 11:00 WIB")
    expect(email.text).toContain("Waktu: Jumat, 20 November 2026, pukul 10.00 sampai 11.00 WIB")
    expect(email.text).not.toContain("WITA")
  })

  it("keeps .ics times in UTC, and all-day dates on the booking's local day", () => {
    const base = {
      method: "REQUEST" as const,
      uid: "x@fsi-crm",
      sequence: 0,
      stamp: NOW,
      summary: "Call",
      organizer: { name: "FSI", email: "hello@fsi.example" },
    }
    const timed = buildIcs({ ...base, startsAt: "2026-11-20T03:00:00.000Z", endsAt: null, allDay: false, timeZone: "Asia/Jakarta" })
    expect(timed).toContain("DTSTART:20261120T030000Z")
    const allDay = buildIcs({ ...base, startsAt: "2026-11-19T15:00:00.000Z", endsAt: "2026-11-20T15:00:00.000Z", allDay: true, timeZone: "Asia/Jayapura" })
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261120")
    expect(allDay).toContain("DTEND;VALUE=DATE:20261121")
  })
})

describe("Overview grouping", () => {
  it("groups by the office day and keeps the booking's own zone and local time", async () => {
    const { deps, store } = setup()
    await createScheduleCore(deps, { leadId: 3, kind: "call", date: "2026-11-20", startTime: "00:30" })
    const views = [...store.rows.values()].map(toScheduleView)
    const days = mergeScheduled([], views, new Map([[3, "Yohanes"]]), { from: "2026-11-13", to: "2026-11-27" })
    expect(days).toEqual([
      {
        day: "2026-11-19",
        items: [
          expect.objectContaining({
            day: "2026-11-19",
            startTime: "23:30",
            timeZone: "Asia/Jayapura",
            zoneLabel: "WIT",
            localDay: "2026-11-20",
            localStartTime: "00:30",
          }),
        ],
      },
    ])
  })

  it("still drops the column date that mirrors the booking's local day", async () => {
    const { deps, store } = setup()
    await createScheduleCore(deps, { leadId: 3, kind: "appointment", date: "2026-11-20", startTime: "00:30" })
    const views = [...store.rows.values()].map(toScheduleView)
    const column = [{ day: "2026-11-20", items: [{ type: "appointment" as const, leadId: 3, name: "Yohanes", salesId: null, day: "2026-11-20" }] }]
    const days = mergeScheduled(column, views, new Map([[3, "Yohanes"]]), { from: "2026-11-13", to: "2026-11-27" })
    expect(days.flatMap((d) => d.items.map((i) => [d.day, i.scheduleId ? "schedule" : "column"]))).toEqual([["2026-11-19", "schedule"]])
  })
})
