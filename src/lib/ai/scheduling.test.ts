import { describe, expect, it, vi } from "vitest"
import type { Notifier } from "@/lib/push/notify"
import { createAiScheduler } from "@/lib/schedules/ai-scheduler"
import { FakeScheduleStore } from "@/lib/schedules/testing"
import { witaToUtc } from "@/lib/schedules/time"
import { createMemoryStore } from "@/lib/whatsapp/testing/memory-store"
import { runAgent } from "./agent"
import { buildSystemPrompt } from "./prompt"
import type { ScheduleBooking } from "./seams"
import { call, fakeModel } from "./testing"
import type { Notice } from "./tools"

vi.mock("server-only", () => ({}))

const SALES_A = "10000000-0000-4000-8000-00000000000a"
const SALES_B = "10000000-0000-4000-8000-00000000000b"
// Monday 16 November 2026, 08:00 WITA.
const NOW = new Date("2026-11-16T00:00:00Z")

type Setup = { leadOwner?: string | null; assigned?: string | null; inactive?: string[]; ready?: boolean; location?: string | null }

async function setup({ leadOwner = SALES_A, assigned = null, inactive = [], ready = true, location = "Canggu, Bali" }: Setup = {}) {
  const db = createMemoryStore({
    leads: [
      { id: 1, customer_name: "Made", phone: "0812", phone_wa: "62812", status: "New", sales_id: leadOwner },
      { id: 2, customer_name: "Ketut", phone: "0813", phone_wa: "62813", status: "New", sales_id: SALES_A },
    ],
    inactiveSales: inactive,
  })
  const conversation = await db.store.createConversation({
    waId: "62812",
    profileName: "Made",
    phoneNumberId: null,
    leadId: 1,
    assignedSalesId: assigned,
  })
  const schedules = new FakeScheduleStore()
  schedules.addLead({ id: 1, customer_name: "Made", sales_id: leadOwner, location })
  schedules.addLead({ id: 2, customer_name: "Ketut", sales_id: SALES_A, location: "Canggu, Bali" })
  const booking: ScheduleBooking = createAiScheduler({
    schedule: {
      store: schedules,
      actor: { id: null, admin: true },
      env: {},
      fetchFn: async () => {
        throw new Error("no network in tests")
      },
      now: () => NOW,
      baseUrl: null,
      bookedVia: "whatsapp_ai",
    },
    googleBusy: async () => ({ state: "not_connected" }),
    ready: async () => ready,
  })
  return { db, conversation, schedules, booking }
}

async function run(s: Awaited<ReturnType<typeof setup>>, steps: Parameters<typeof fakeModel>[0], booking: ScheduleBooking | null = s.booking) {
  const notices: Notice[] = []
  const { model, calls } = fakeModel(steps)
  const conversation = (await s.db.store.getConversation(s.conversation.id))!
  const result = await runAgent({ store: s.db.store, model, conversation, now: NOW, notices, deadline: Date.now() + 30_000, booking })
  // The last model call sees every tool result of the run, in order.
  const last = calls.at(-1)?.messages.filter((m) => m.role === "tool").map((m) => JSON.parse(m.content as string)) ?? []
  const pushed: Array<{ salesId: string; body: string }> = []
  const notifier = {
    handoff: vi.fn(async () => ({ recipients: 1, devices: 0, delivered: 0 })),
    assigned: vi.fn(async () => ({ recipients: 1, devices: 0, delivered: 0 })),
    scheduleChanged: vi.fn(async (_c, salesId: string, body: string) => {
      pushed.push({ salesId, body })
      return { recipients: 1, devices: 0, delivered: 0 }
    }),
  } satisfies Notifier
  await Promise.all(notices.map((notice) => notice(notifier)))
  return { result, calls, tools: last, pushed, notifier }
}

const done = { content: "OK" }

describe("scheduling tools", () => {
  it("are offered to the model, and the prompt tells it to use only their times, in WITA", async () => {
    const s = await setup()
    const { calls } = await run(s, [done])
    const names = calls[0].tools.map((t) => t.name)
    expect(names).toEqual(expect.arrayContaining(["check_availability", "book_schedule", "reschedule_my_booking", "cancel_my_booking"]))
    expect(names).not.toContain("book_site_visit")

    const prompt = buildSystemPrompt({ profileName: null, leadLinked: true, answers: {}, today: "2026-11-16" })
    expect(prompt).toMatch(/Offer only the times it returns/)
    expect(prompt).toMatch(/WITA/)
    expect(prompt).toMatch(/wait for a clear yes/)
    expect(prompt).toMatch(/representative will confirm it\. Never call it confirmed/)
    expect(prompt).toMatch(/never comes with a promised price/)
  })

  it("answer not set up honestly when the schedule service is missing or not ready", async () => {
    const s = await setup({ ready: false })
    for (const booking of [null, s.booking]) {
      const { tools } = await run(s, [{ toolCalls: [call("check_availability", { kind: "call", date: "2026-11-17" })] }, done], booking)
      expect(tools[0]).toMatchObject({ status: "not_configured", tell_customer: expect.stringMatching(/Do not offer or confirm any date or time/) })
    }
    expect(s.schedules.rows.size).toBe(0)
  })

  it("check, then book: unconfirmed, notifies the salesperson, and never emails", async () => {
    const s = await setup()
    const { tools, pushed } = await run(s, [
      { toolCalls: [call("check_availability", { kind: "site_survey", date: "2026-11-17", preferred_time: "10:00" })] },
      { toolCalls: [call("book_schedule", { kind: "site_survey", date: "2026-11-17", start_time: "10:00", location: "Ubud" })] },
      done,
    ])
    expect(tools[0]).toMatchObject({ status: "ok", time_zone: expect.stringMatching(/WITA/) })
    expect(tools[0].slots.map((x: { start_time: string }) => x.start_time)).toContain("10:00")
    expect(tools[1]).toMatchObject({
      status: "booked_unconfirmed",
      label: "Tue 17 Nov, 10:00 to 12:00 WITA",
      tell_customer: expect.stringMatching(/Do not call it confirmed/),
    })
    const row = [...s.schedules.rows.values()][0]
    expect(row).toMatchObject({ lead_id: 1, sales_id: SALES_A, booked_via: "whatsapp_ai", notify_lead: false, email_status: "not_requested" })
    expect(pushed).toEqual([{ salesId: SALES_A, body: "AI booked a site survey: Tue 17 Nov, 10:00 to 12:00 WITA. Please confirm." }])
  })

  it("with no active lead owner, books with the conversation's assignee", async () => {
    const s = await setup({ leadOwner: SALES_B, inactive: [SALES_B], assigned: SALES_A })
    await run(s, [{ toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "09:00" })] }, done])
    expect([...s.schedules.rows.values()][0]).toMatchObject({ sales_id: SALES_A })
  })

  it("with nobody to book with, hands over to a person instead", async () => {
    const s = await setup({ leadOwner: null })
    const { tools, notifier } = await run(s, [{ toolCalls: [call("check_availability", { kind: "call", date: "2026-11-17" })] }, done])
    expect(tools[0]).toMatchObject({ status: "handed_off" })
    expect((await s.db.store.getConversation(s.conversation.id))?.mode).toBe("human")
    expect(s.db.events.some((e) => e.type === "handoff_requested")).toBe(true)
    expect(notifier.handoff).toHaveBeenCalled()
  })

  it("does not book a second one of the same kind", async () => {
    const s = await setup()
    await run(s, [{ toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "09:00" })] }, done])
    const { tools } = await run(s, [{ toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-18", start_time: "09:00" })] }, done])
    expect(tools[0]).toMatchObject({ status: "already_booked" })
    expect(s.schedules.rows.size).toBe(1)
  })

  it("reschedules and cancels only this lead's own AI booking", async () => {
    const s = await setup()
    // Another lead's AI booking must stay out of reach.
    const other = await s.schedules.insert({
      lead_id: 2,
      sales_id: SALES_A,
      kind: "call",
      title: "Call",
      starts_at: witaToUtc("2026-11-18", "09:00"),
      ends_at: witaToUtc("2026-11-18", "09:30"),
      booked_via: "whatsapp_ai",
    })
    const none = await run(s, [{ toolCalls: [call("cancel_my_booking", {})] }, done])
    expect(none.tools[0]).toMatchObject({ status: "no_booking" })
    expect(s.schedules.rows.get(other.id)?.status).toBe("scheduled")

    await run(s, [{ toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "09:00" })] }, done])
    const moved = await run(s, [{ toolCalls: [call("reschedule_my_booking", { new_date: "2026-11-17", new_start_time: "14:00" })] }, done])
    expect(moved.tools[0]).toMatchObject({ status: "rescheduled_unconfirmed", from: "Tue 17 Nov, 09:00 to 09:30 WITA", label: "Tue 17 Nov, 14:00 to 14:30 WITA" })
    expect(moved.pushed[0].body).toBe("AI moved a call to Tue 17 Nov, 14:00 to 14:30 WITA. Please confirm.")

    const cancelled = await run(s, [{ toolCalls: [call("cancel_my_booking", { kind: "call" })] }, done])
    expect(cancelled.tools[0]).toMatchObject({ status: "cancelled" })
    expect(cancelled.pushed[0].body).toMatch(/^Customer cancelled a call on WhatsApp/)
    expect(s.schedules.rows.get(other.id)?.status).toBe("scheduled")
  })

  it("hands a staff-made booking to a person instead of moving or cancelling it", async () => {
    const s = await setup()
    const staff = await s.schedules.insert({
      lead_id: 1,
      sales_id: SALES_A,
      kind: "site_survey",
      title: "Survey",
      starts_at: witaToUtc("2026-11-18", "09:00"),
      ends_at: witaToUtc("2026-11-18", "11:00"),
      created_by: SALES_A,
    })
    const { tools } = await run(s, [{ toolCalls: [call("reschedule_my_booking", { new_date: "2026-11-19", new_start_time: "09:00" })] }, done])
    expect(tools[0]).toMatchObject({ status: "handed_off" })
    expect(s.schedules.rows.get(staff.id)).toMatchObject({ status: "scheduled", starts_at: witaToUtc("2026-11-18", "09:00"), reschedule_count: 0 })
    expect((await s.db.store.getConversation(s.conversation.id))?.mode).toBe("human")
  })

  it("stops booking when a person takes over mid-run", async () => {
    // Taken over while the model was thinking: the agent stops before running the tool.
    const s = await setup()
    const takeOver = () =>
      s.db.store.updateConversation(s.conversation.id, { mode: "human", taken_over_by: SALES_A, taken_over_at: NOW.toISOString() })
    const first = await run(s, [
      async () => {
        await takeOver()
        return { toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "09:00" })] }
      },
    ])
    expect(first.result).toMatchObject({ stopped: true, reply: null })
    expect(s.schedules.rows.size).toBe(0)

    // Taken over between two tools in the same round: the booking tool refuses.
    const t = await setup()
    const slow: ScheduleBooking = {
      ...t.booking,
      async availability(input) {
        await t.db.store.updateConversation(t.conversation.id, { mode: "human", taken_over_by: SALES_A, taken_over_at: NOW.toISOString() })
        return t.booking.availability(input)
      },
    }
    const second = await run(
      t,
      [
        {
          toolCalls: [
            call("check_availability", { kind: "call", date: "2026-11-17" }),
            call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "09:00" }),
          ],
        },
        done,
      ],
      slow,
    )
    expect(second.tools[1]).toMatchObject({ status: "taken_over" })
    expect(t.schedules.rows.size).toBe(0)
  })

  it("asks for the city when the zone is unclear, then offers and books in the customer's own time", async () => {
    const s = await setup({ location: "zen villa" })
    const first = await run(s, [
      { toolCalls: [call("check_availability", { kind: "call", date: "2026-11-17" })] },
      { toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "10:00" })] },
      done,
    ])
    expect(first.tools[0]).toMatchObject({ status: "needs_location", note: expect.stringMatching(/Ask which city or area/) })
    expect(first.tools[1]).toMatchObject({ status: "needs_location" })
    expect(s.schedules.rows.size).toBe(0)

    // The customer says Surabaya; the assistant saves it as a qualification answer and checks again.
    const second = await run(s, [
      { toolCalls: [call("save_qualification_answers", { location: "Surabaya" })] },
      { toolCalls: [call("check_availability", { kind: "call", date: "2026-11-17" })] },
      { toolCalls: [call("book_schedule", { kind: "call", date: "2026-11-17", start_time: "16:00" })] },
      done,
    ])
    expect(second.tools[1]).toMatchObject({
      status: "ok",
      time_zone: "WIB (Western Indonesia Time, UTC+7)",
      note: expect.stringMatching(/always write them with "WIB"/),
    })
    expect(second.tools[1].slots[0]).toMatchObject({ start_time: "09:00", time_zone: "WIB", label: "Tue 17 Nov, 09:00 to 09:30 WIB" })
    expect(second.tools[2]).toMatchObject({ status: "booked_unconfirmed", time_zone: "WIB", label: "Tue 17 Nov, 16:00 to 16:30 WIB" })
    expect([...s.schedules.rows.values()][0]).toMatchObject({ time_zone: "Asia/Jakarta", starts_at: "2026-11-17T09:00:00.000Z" })
    expect(second.pushed[0].body).toBe("AI booked a call: Tue 17 Nov, 16:00 to 16:30 WIB. Please confirm.")
    // leads.location is never written from the chat.
    expect(s.schedules.leads.get(1)?.location).toBe("zen villa")
  })

  it("uses a confident leads.location without asking", async () => {
    const s = await setup({ location: "Sorong" })
    const { tools } = await run(s, [{ toolCalls: [call("check_availability", { kind: "call", date: "2026-11-17" })] }, done])
    expect(tools[0]).toMatchObject({ status: "ok", time_zone: expect.stringMatching(/^WIT /) })
    expect(tools[0].slots[0].label).toMatch(/ WIT$/)
  })

  it("tells the model to ask for the city and to label every time", () => {
    const prompt = buildSystemPrompt({ profileName: null, leadLinked: true, answers: {}, today: "2026-11-16" })
    expect(prompt).toMatch(/needs_location, ask which city or area/)
    expect(prompt).toMatch(/Never write a time without its label/)
    expect(prompt).toMatch(/WIB \(UTC\+7/)
  })
})
