import { describe, expect, it } from "vitest"
import { checkSlotRules, findSlots, foreignGoogleBusy, type Interval } from "./availability"
import { witaToUtc } from "./time"
import type { ScheduleRow } from "./view"

const WITA = "Asia/Makassar" as const
// Monday 16 November 2026, 08:00 WITA.
const NOW = new Date("2026-11-16T00:00:00Z")

const span = (day: string, from: string, to: string): Interval => ({
  start: Date.parse(witaToUtc(day, from)),
  end: Date.parse(witaToUtc(day, to)),
})
const starts = (slots: Array<{ date: string; startTime: string }>) => slots.map((s) => `${s.date} ${s.startTime}`)

describe("findSlots", () => {
  it("offers only working hours, from the minimum notice on, up to three", () => {
    // 4 hours' notice from 08:00: nothing before 12:00 today.
    const slots = findSlots({ kind: "call", fromDay: "2026-11-16", now: NOW, busy: [], zone: WITA })
    expect(starts(slots)).toEqual(["2026-11-16 12:00", "2026-11-16 13:00", "2026-11-16 14:00"])
    expect(slots[0]).toMatchObject({ endTime: "12:30", startsAt: "2026-11-16T04:00:00.000Z" })
  })

  it("never offers a past day: an earlier day yields nothing for that day", () => {
    const slots = findSlots({ kind: "call", fromDay: "2026-11-14", now: NOW, busy: [], zone: WITA })
    expect(slots.every((s) => s.date >= "2026-11-16")).toBe(true)
  })

  it("skips the salesperson's existing bookings", () => {
    const busy = [span("2026-11-16", "12:00", "13:30")]
    const slots = findSlots({ kind: "call", fromDay: "2026-11-16", now: NOW, busy, zone: WITA })
    expect(starts(slots)).toEqual(["2026-11-16 14:00", "2026-11-16 15:00", "2026-11-16 16:00"])
  })

  it("keeps a long visit inside the working day and moves on to the next working day", () => {
    // Saturday is a working day, Sunday is not; a 2-hour survey cannot start after 15:00.
    const busy = [span("2026-11-21", "09:00", "17:00")]
    const slots = findSlots({ kind: "site_survey", fromDay: "2026-11-21", now: NOW, busy, zone: WITA })
    expect(starts(slots)).toEqual(["2026-11-23 09:00", "2026-11-23 10:00", "2026-11-23 11:00"])
    expect(slots.every((s) => s.endTime <= "17:00")).toBe(true)
  })

  it("puts the slots nearest the preferred time first", () => {
    const slots = findSlots({ kind: "site_survey", fromDay: "2026-11-17", preferredTime: "15:00", now: NOW, busy: [], zone: WITA })
    expect(starts(slots)).toEqual(["2026-11-17 13:00", "2026-11-17 14:00", "2026-11-17 15:00"])
  })
})

describe("checkSlotRules", () => {
  it("refuses times the assistant may not book", () => {
    expect(checkSlotRules("call", "2026-11-16", "10:00", NOW, WITA)).toBe("too_soon")
    expect(checkSlotRules("call", "2026-11-15", "12:00", NOW, WITA)).toBe("not_working_day")
    expect(checkSlotRules("site_survey", "2026-11-17", "16:00", NOW, WITA)).toBe("outside_hours")
    expect(checkSlotRules("call", "2026-11-17", "08:30", NOW, WITA)).toBe("outside_hours")
    expect(checkSlotRules("call", "2027-03-01", "10:00", NOW, WITA)).toBe("too_far")
    expect(checkSlotRules("call", "17/11/2026", "10:00", NOW, WITA)).toBe("bad_input")
    expect(checkSlotRules("call", "2026-11-17", "10am", NOW, WITA)).toBe("bad_input")
    expect(checkSlotRules("site_survey", "2026-11-17", "10:15", NOW, WITA)).toBeNull()
  })
})

describe("foreignGoogleBusy", () => {
  it("drops the CRM's own events and keeps everything else on the shared calendar", () => {
    const crm = {
      starts_at: witaToUtc("2026-11-17", "10:00"),
      ends_at: witaToUtc("2026-11-17", "11:00"),
      all_day: false,
      google_event_id: "abc",
    } as ScheduleRow
    const own = span("2026-11-17", "10:00", "11:00")
    const other = span("2026-11-17", "13:00", "14:00")
    expect(foreignGoogleBusy([own, other], [crm])).toEqual([other])
  })
})
