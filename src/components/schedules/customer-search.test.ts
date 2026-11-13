import { describe, expect, it, vi } from "vitest"
import { FakeScheduleStore } from "@/lib/schedules/testing"
import { createValues, toCreateInput, validateBooking, withKind } from "./booking-model"
import {
  SEARCH_IDLE,
  bookingLeadOf,
  finishSearch,
  hitsOf,
  moveActive,
  placeLine,
  searchMessage,
  startSearch,
  type CustomerHit,
} from "./customer-search"

vi.mock("server-only", () => ({}))
const { createScheduleCore } = await import("@/lib/schedules/service")

const TODAY = "2026-11-13"
const SALES = "10000000-0000-4000-8000-00000000000a"
const ADMIN = "10000000-0000-4000-8000-00000000000c"

const MASSIMO: CustomerHit = {
  id: 4465,
  name: " Massimo Rossi ",
  phone: "081234567890",
  business: "Villa Rossi",
  location: " Canggu ",
  status: "First meeting",
  email: "massimo@example.com",
  salesId: SALES,
}
const BARE: CustomerHit = { id: 7, name: null, phone: null, business: null, location: null, status: null, email: null, salesId: null }

describe("customer search state", () => {
  it("is idle for a blank box and keeps the last hits on screen while a new search runs", () => {
    expect(startSearch(SEARCH_IDLE, "   ")).toEqual(SEARCH_IDLE)
    const done = finishSearch({ ok: true, hits: [MASSIMO], more: false }, " Mass ")
    expect(done).toEqual({ kind: "done", hits: [MASSIMO], term: "Mass", more: false })
    const loading = startSearch(done, "Massi")
    expect(loading).toEqual({ kind: "loading", hits: [MASSIMO] })
    expect(hitsOf(loading)).toEqual([MASSIMO])
    expect(startSearch(done, "")).toEqual(SEARCH_IDLE)
  })

  it("turns a failed search into an error with no hits", () => {
    const failed = finishSearch({ ok: false }, "Massimo")
    expect(failed).toEqual({ kind: "error" })
    expect(hitsOf(failed)).toEqual([])
    expect(startSearch(failed, "Massimo")).toEqual({ kind: "loading", hits: [] })
  })

  it("says what happened in plain words", () => {
    expect(searchMessage(SEARCH_IDLE)).toMatch(/name, phone number or business/)
    expect(searchMessage({ kind: "loading", hits: [] })).toBe("Searching…")
    expect(searchMessage({ kind: "error" })).toMatch(/search failed/)
    expect(searchMessage({ kind: "done", hits: [], term: "Zed", more: false })).toMatch(/No customer matches "Zed"/)
    expect(searchMessage({ kind: "done", hits: [MASSIMO], term: "M", more: false })).toBe("1 customer found.")
    expect(searchMessage({ kind: "done", hits: [MASSIMO, BARE], term: "M", more: false })).toBe("2 customers found.")
    expect(searchMessage({ kind: "done", hits: [MASSIMO, BARE], term: "M", more: true })).toMatch(/First 2 by name/)
  })

  it("moves the highlight with the arrows, wrapping, and leaves other keys to the text box", () => {
    expect(moveActive(0, "ArrowDown", 3)).toBe(1)
    expect(moveActive(2, "ArrowDown", 3)).toBe(0)
    expect(moveActive(0, "ArrowUp", 3)).toBe(2)
    expect(moveActive(0, "ArrowDown", 0)).toBeNull()
    expect(moveActive(1, "Home", 3)).toBeNull()
    expect(moveActive(1, "a", 3)).toBeNull()
  })

  it("shows business and location under the name, skipping what is empty", () => {
    expect(placeLine(MASSIMO)).toBe("Villa Rossi · Canggu")
    expect(placeLine({ business: "  ", location: "Ubud" })).toBe("Ubud")
    expect(placeLine(BARE)).toBe("")
  })
})

describe("picking a customer", () => {
  it("fills the form as on the customer's page", () => {
    const lead = bookingLeadOf(MASSIMO)
    expect(lead).toEqual({ id: 4465, name: "Massimo Rossi", location: " Canggu ", email: "massimo@example.com", salesId: SALES })
    const values = createValues(lead, TODAY)
    expect(values).toMatchObject({ kind: "appointment", date: TODAY, title: "Appointment: Massimo Rossi", location: "Canggu", salesId: SALES })
    expect(withKind(values, "site_survey", lead.name).title).toBe("Site survey: Massimo Rossi")
  })

  it("names a customer without a name the way the lists do", () => {
    expect(bookingLeadOf(BARE).name).toBe("Unnamed lead")
    expect(createValues(bookingLeadOf(BARE), TODAY).location).toBe("")
  })
})

describe("booking from a day", () => {
  const lead = bookingLeadOf(MASSIMO)

  it("starts on the day that was clicked", () => {
    expect(createValues(lead, TODAY, "2026-11-20").date).toBe("2026-11-20")
    expect(createValues(lead, TODAY, TODAY).date).toBe(TODAY)
  })

  it("starts on today for a day that has passed or when no day is given", () => {
    expect(createValues(lead, TODAY, "2026-11-12").date).toBe(TODAY)
    expect(createValues(lead, TODAY, "").date).toBe(TODAY)
    expect(createValues(lead, TODAY).date).toBe(TODAY)
  })
})

// The write path, against the in-memory store: nothing reaches the database.
describe("saving a booking made on the Calendar", () => {
  function deps(store: FakeScheduleStore, actor: { id: string; admin: boolean }) {
    return { store, actor, env: {}, fetchFn: fetch, now: () => new Date("2026-11-13T01:00:00.000Z"), baseUrl: null }
  }

  it("books the picked customer on the clicked day", async () => {
    const store = new FakeScheduleStore()
    store.addLead({ id: MASSIMO.id, customer_name: "Massimo Rossi", sales_id: SALES })
    const lead = bookingLeadOf(MASSIMO)
    const values = { ...withKind(createValues(lead, TODAY, "2026-11-20"), "site_survey", lead.name), startTime: "10:00" }
    expect(validateBooking("create", values, new Date("2026-11-13T01:00:00.000Z"))).toEqual({})

    const result = await createScheduleCore(deps(store, { id: ADMIN, admin: true }), toCreateInput(lead.id, values, { admin: true, canPickSales: true }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule).toMatchObject({
      leadId: 4465,
      kind: "site_survey",
      day: "2026-11-20",
      startTime: "10:00",
      endTime: "11:00",
      title: "Site survey: Massimo Rossi",
      location: "Canggu",
      salesId: SALES,
      bookedBy: "staff",
      needsConfirmation: false,
    })
    expect(store.rows.size).toBe(1)
  })

  it("refuses a customer the salesperson cannot see, saving nothing", async () => {
    const store = new FakeScheduleStore()
    store.addLead({ id: MASSIMO.id, sales_id: ADMIN })
    store.visibleLeads = new Set()
    const lead = bookingLeadOf(MASSIMO)
    const values = { ...createValues(lead, TODAY, "2026-11-20"), startTime: "10:00" }
    const result = await createScheduleCore(deps(store, { id: SALES, admin: false }), toCreateInput(lead.id, values, { admin: false, canPickSales: false }))
    expect(result.ok).toBe(false)
    expect(store.rows.size).toBe(0)
  })
})
