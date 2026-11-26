import { describe, expect, it } from "vitest"
import { dayOf } from "@/lib/leads/dates"
import { calendarWeeks, groupByDay, itemTime, mergeScheduled, scheduleWindow, type ScheduleRow } from "./schedule"

function row(id: number, dates: Partial<ScheduleRow>): ScheduleRow {
  return {
    id,
    customer_name: `Customer ${id}`,
    sales_id: null,
    status: "First Contact",
    appointment: null,
    site_survey: null,
    follow_up_date: null,
    ...dates,
  }
}

describe("schedule window", () => {
  it("starts on the Bali day, which is already tomorrow late in the UTC evening", () => {
    // 17:30 UTC on 12 Nov is 01:30 on 13 Nov in Bali (UTC+8).
    const window = scheduleWindow(dayOf("2026-11-12T17:30:00Z"))
    expect(window).toEqual({ from: "2026-11-13", to: "2026-11-27" })
    // 15:59 UTC is still 23:59 on the 12th in Bali.
    expect(scheduleWindow(dayOf("2026-11-12T15:59:00Z")).from).toBe("2026-11-12")
  })
})

describe("grouping schedule items by Bali day", () => {
  const window = { from: "2026-11-13", to: "2026-11-27" }

  it("groups by day, soonest first, with appointments before site surveys before follow-ups", () => {
    const days = groupByDay(
      [
        row(1, { follow_up_date: "2026-11-14" }),
        row(2, { site_survey: "2026-11-14", appointment: "2026-11-13" }),
        row(3, { appointment: "2026-11-14" }),
      ],
      window,
    )
    expect(days.map((d) => d.day)).toEqual(["2026-11-13", "2026-11-14"])
    expect(days[1].items.map((i) => [i.type, i.leadId])).toEqual([
      ["appointment", 3],
      ["site_survey", 2],
      ["follow_up", 1],
    ])
  })

  it("includes today and the 14th day ahead, and nothing outside them", () => {
    const days = groupByDay(
      [
        row(1, { appointment: "2026-11-12" }),
        row(2, { appointment: "2026-11-13" }),
        row(3, { appointment: "2026-11-27" }),
        row(4, { appointment: "2026-11-28" }),
      ],
      window,
    )
    expect(days.flatMap((d) => d.items.map((i) => i.leadId))).toEqual([2, 3])
  })

  it("lists one lead once per date it has", () => {
    const days = groupByDay([row(1, { appointment: "2026-11-20", follow_up_date: "2026-11-20" })], window)
    expect(days[0].items.map((i) => i.type)).toEqual(["appointment", "follow_up"])
  })

  it("leaves out a follow-up on a lead already at Deal or No deal, but keeps its appointment", () => {
    const days = groupByDay(
      [row(1, { status: "Deal", follow_up_date: "2026-11-15", appointment: "2026-11-16" })],
      window,
    )
    expect(days.map((d) => [d.day, d.items[0].type])).toEqual([["2026-11-16", "appointment"]])
  })

  it("reads only the day from a value stored with a time", () => {
    const days = groupByDay([row(1, { site_survey: "2026-11-15T00:00:00+00:00" })], window)
    expect(days[0].day).toBe("2026-11-15")
  })

  it("is empty when nothing is dated", () => {
    expect(groupByDay([row(1, {})], window)).toEqual([])
  })
})

describe("mini calendar", () => {
  it("covers whole weeks from Monday and marks today, the window and the days with items", () => {
    const window = { from: "2026-11-13", to: "2026-11-27" }
    const weeks = calendarWeeks(window, groupByDay([row(1, { appointment: "2026-11-20" })], window))
    expect(weeks).toHaveLength(3)
    expect(weeks[0][0]).toMatchObject({ day: "2026-11-09", inWindow: false, today: false })
    expect(weeks[0][4]).toMatchObject({ day: "2026-11-13", inWindow: true, today: true })
    expect(weeks[1][4]).toMatchObject({ day: "2026-11-20", count: 1 })
    expect(weeks[2][6]).toMatchObject({ day: "2026-11-29", inWindow: false })
  })
})

describe("merging lead_schedules items", () => {
  const window = { from: "2026-11-13", to: "2026-11-27" }
  const entry = (id: string, leadId: number, kind: "appointment" | "site_survey" | "call" | "follow_up", day: string, startTime: string | null = "10:00") => ({
    id,
    leadId,
    salesId: null,
    kind,
    title: `${kind} ${leadId}`,
    timeZone: "Asia/Makassar" as const,
    zoneLabel: "WITA" as const,
    day,
    startTime,
    officeDay: day,
    officeStartTime: startTime,
  })

  it("drops the column date a schedule mirrors, and keeps a different hand-typed date", () => {
    const days = groupByDay(
      [row(1, { site_survey: "2026-11-20" }), row(2, { site_survey: "2026-11-22" })],
      window,
    )
    const merged = mergeScheduled(
      days,
      [entry("s1", 1, "site_survey", "2026-11-20"), entry("s2", 2, "site_survey", "2026-11-21")],
      new Map([[1, "Customer 1"], [2, "Customer 2"]]),
      window,
    )
    expect(merged.flatMap((d) => d.items.map((i) => [i.day, i.leadId, i.scheduleId ?? "column"]))).toEqual([
      ["2026-11-20", 1, "s1"],
      ["2026-11-21", 2, "s2"],
      ["2026-11-22", 2, "column"],
    ])
  })

  it("shows a call as an appointment and drops the mirrored appointment date", () => {
    const days = groupByDay([row(1, { appointment: "2026-11-20" })], window)
    const merged = mergeScheduled(days, [entry("s1", 1, "call", "2026-11-20", "14:00")], new Map([[1, "Customer 1"]]), window)
    expect(merged[0].items).toEqual([
      expect.objectContaining({ type: "appointment", kind: "call", scheduleId: "s1", startTime: "14:00", name: "Customer 1" }),
    ])
  })

  it("orders a day's items by type, then time, and leaves out items outside the window or without a lead", () => {
    const merged = mergeScheduled(
      [],
      [
        entry("late", 1, "appointment", "2026-11-20", "15:00"),
        entry("early", 2, "appointment", "2026-11-20", "08:00"),
        entry("out", 3, "appointment", "2026-12-20"),
        { ...entry("orphan", 4, "appointment", "2026-11-20"), leadId: null },
      ],
      new Map(),
      window,
    )
    expect(merged[0].items.map((i) => i.scheduleId)).toEqual(["early", "late"])
  })
})

describe("booked item time", () => {
  it("labels the customer's time and adds Bali time when the zone is not WITA", () => {
    expect(itemTime({ scheduleId: "a", startTime: "11:00", zoneLabel: "WIB", localStartTime: "10:00" })).toBe("10:00 WIB (11:00 WITA)")
    expect(itemTime({ scheduleId: "a", startTime: "09:00", zoneLabel: "WIT", localStartTime: "10:00" })).toBe("10:00 WIT (09:00 WITA)")
    expect(itemTime({ scheduleId: "a", startTime: "10:00", zoneLabel: "WITA", localStartTime: "10:00" })).toBe("10:00 WITA")
    expect(itemTime({ scheduleId: "a", startTime: null, zoneLabel: "WIB", localStartTime: null })).toBe("All day")
    expect(itemTime({ startTime: undefined })).toBeNull()
  })
})
