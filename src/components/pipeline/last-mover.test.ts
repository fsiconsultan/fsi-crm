import { describe, expect, it } from "vitest"
import { lastMover, latestAutomated } from "./last-mover"

const AT = "2026-11-12T02:00:00.000Z"
const lead = (status: string | null, startedAt: string | null = AT) => ({ status, status_started_at: startedAt })

describe("last mover marker", () => {
  it("says AI when the automation's newest change is the current status, written at the same instant", () => {
    expect(lastMover(lead("First Contact"), { status: "First Contact", at: AT })).toBe("ai")
    // The same instant in another notation, as Postgres returns it.
    expect(lastMover(lead("First Contact", "2026-11-12T02:00:00+00:00"), { status: "First Contact", at: AT })).toBe("ai")
  })

  it("says Person when a person changed the status after the automation", () => {
    expect(lastMover(lead("Quotation", "2026-11-13T05:00:00Z"), { status: "First Contact", at: AT })).toBe("person")
  })

  it("says Person when a person moved it away and back to the same status (the time differs)", () => {
    expect(lastMover(lead("First Contact", "2026-11-13T05:00:00Z"), { status: "First Contact", at: AT })).toBe("person")
  })

  it("says Person when the automation never wrote a status on the lead", () => {
    expect(lastMover(lead("New"), null)).toBe("person")
  })

  it("says Person when the status has no date, since the automation always writes one", () => {
    expect(lastMover(lead("New", null), { status: "New", at: AT })).toBe("person")
  })

  it("shows nothing when the history could not be read, or the lead has no status", () => {
    expect(lastMover(lead("New"), undefined)).toBeNull()
    expect(lastMover(lead(null), { status: "New", at: AT })).toBeNull()
  })
})

describe("newest automated status per lead", () => {
  const rows = [
    { lead_id: 1, detail: { to: "First Contact", at: "2026-11-12T03:00:00Z" } },
    { lead_id: 1, detail: { to: "New", at: AT } },
    { lead_id: 2, detail: { note: "no status in this row" } },
  ]

  it("keeps the first (newest) row of each lead and marks leads with no row as never automated", () => {
    const latest = latestAutomated([1, 2, 3], rows, true)
    expect(latest.get(1)).toEqual({ status: "First Contact", at: "2026-11-12T03:00:00Z" })
    expect(latest.get(2)).toBeNull()
    expect(latest.get(3)).toBeNull()
  })

  it("leaves a lead with no row unknown when the rows were cut off at the limit", () => {
    const latest = latestAutomated([1, 3], rows, false)
    expect(latest.has(3)).toBe(false)
    expect(lastMover(lead("New"), latest.get(3))).toBeNull()
  })
})
