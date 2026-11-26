import { describe, expect, it } from "vitest"
import { makeSchedule } from "./fixtures"
import {
  aiBooking,
  dayHeading,
  gridRange,
  groupSchedules,
  isOverdue,
  monthGrid,
  monthLabel,
  moveDay,
  officeTimeLabel,
  onDay,
  byDay,
  shiftMonth,
  timeLabel,
  whenLabel,
  whenText,
} from "./model"

// 13 Nov 2026, 14:00 in Bali.
const NOW = "2026-11-13T06:00:00.000Z"
const TODAY = "2026-11-13"

describe("month grid", () => {
  it("covers whole weeks, Monday first, for November 2026", () => {
    const weeks = monthGrid("2026-11", TODAY, [], NOW)
    expect(weeks).toHaveLength(6)
    expect(weeks[0][0].day).toBe("2026-10-26")
    expect(weeks[5][6].day).toBe("2026-12-06")
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0][0].inMonth).toBe(false)
    expect(weeks[0][6]).toMatchObject({ day: "2026-11-01", inMonth: true })
  })

  it("marks today only", () => {
    const cells = monthGrid("2026-11", TODAY, [], NOW).flat()
    expect(cells.filter((cell) => cell.today).map((cell) => cell.day)).toEqual([TODAY])
  })

  it("puts one dot per kind, in kind order, and leaves cancelled items out", () => {
    const items = [
      makeSchedule({ kind: "follow_up", starts_at: "2026-11-18T05:00:00.000Z", ends_at: null }),
      makeSchedule({ kind: "site_survey", starts_at: "2026-11-18T02:00:00.000Z" }),
      makeSchedule({ kind: "site_survey", starts_at: "2026-11-18T07:00:00.000Z", ends_at: "2026-11-18T08:00:00.000Z" }),
      makeSchedule({ kind: "call", starts_at: "2026-11-18T09:00:00.000Z", status: "cancelled" }),
    ]
    const cell = monthGrid("2026-11", TODAY, items, NOW).flat().find((c) => c.day === "2026-11-18")
    expect(cell?.dots).toEqual(["site_survey", "follow_up"])
    expect(cell?.count).toBe(3)
  })

  it("shows an overdue item as a pink dot first", () => {
    const items = [
      makeSchedule({ kind: "call", starts_at: "2026-11-10T02:00:00.000Z", ends_at: "2026-11-10T02:30:00.000Z" }),
      makeSchedule({ kind: "appointment", starts_at: "2026-11-10T03:00:00.000Z", status: "done" }),
    ]
    const cell = monthGrid("2026-11", TODAY, items, NOW).flat().find((c) => c.day === "2026-11-10")
    expect(cell?.dots).toEqual(["overdue", "appointment"])
  })

  it("files items by their Bali day, not the UTC day", () => {
    // 17 Nov 16:30 UTC is 18 Nov 00:30 in Bali (UTC+8).
    const late = makeSchedule({ starts_at: "2026-11-17T16:30:00.000Z", ends_at: "2026-11-17T17:30:00.000Z" })
    // 30 Nov 16:00 UTC is 1 Dec 00:00 in Bali, shown in the grid's trailing week.
    const midnight = makeSchedule({ kind: "call", starts_at: "2026-11-30T16:00:00.000Z", ends_at: "2026-11-30T16:30:00.000Z" })
    const cells = monthGrid("2026-11", TODAY, [late, midnight], NOW).flat()
    const dotsOn = (day: string) => cells.find((c) => c.day === day)?.dots
    expect(late.day).toBe("2026-11-18")
    expect(dotsOn("2026-11-17")).toEqual([])
    expect(dotsOn("2026-11-18")).toEqual(["appointment"])
    expect(dotsOn("2026-11-30")).toEqual([])
    expect(cells.find((c) => c.day === "2026-12-01")).toMatchObject({ inMonth: false, dots: ["call"] })
  })

  it("moves months across years and names them", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
    expect(monthLabel("2026-11")).toBe("November 2026")
    expect(gridRange("2027-02")).toEqual({ from: "2027-02-01", to: "2027-02-28" })
  })

  it("moves the focused day with arrow keys", () => {
    expect(moveDay("2026-11-30", "ArrowRight")).toBe("2026-12-01")
    expect(moveDay("2026-11-03", "ArrowUp")).toBe("2026-10-27")
    expect(moveDay("2026-11-18", "Home")).toBe("2026-11-16")
    expect(moveDay("2026-11-18", "End")).toBe("2026-11-22")
    expect(moveDay("2026-11-18", "a")).toBeNull()
  })
})

describe("list grouping", () => {
  it("splits upcoming, overdue and past", () => {
    const later = makeSchedule({ starts_at: "2026-11-20T02:00:00.000Z", ends_at: "2026-11-20T03:00:00.000Z" })
    const soon = makeSchedule({ starts_at: "2026-11-13T07:00:00.000Z", ends_at: "2026-11-13T08:00:00.000Z" })
    // Today 09:00 to 10:00 Bali: the time has passed, so it is overdue even though it is today.
    const thisMorning = makeSchedule({ starts_at: "2026-11-13T01:00:00.000Z", ends_at: "2026-11-13T02:00:00.000Z" })
    const lastWeek = makeSchedule({ starts_at: "2026-11-06T01:00:00.000Z", ends_at: "2026-11-06T02:00:00.000Z" })
    const done = makeSchedule({ starts_at: "2026-11-01T01:00:00.000Z", status: "done" })
    const cancelled = makeSchedule({ starts_at: "2026-11-25T01:00:00.000Z", status: "cancelled" })

    const groups = groupSchedules([later, cancelled, lastWeek, soon, done, thisMorning, soon], NOW)
    expect(groups.upcoming.map((i) => i.id)).toEqual([soon.id, later.id])
    expect(groups.overdue.map((i) => i.id)).toEqual([thisMorning.id, lastWeek.id])
    expect(groups.past.map((i) => i.id)).toEqual([cancelled.id, done.id])
  })

  it("keeps an all-day item upcoming until its Bali day ends", () => {
    const allDay = makeSchedule({ all_day: true, starts_at: "2026-11-12T16:00:00.000Z", ends_at: "2026-11-13T16:00:00.000Z" })
    expect(allDay.day).toBe(TODAY)
    expect(isOverdue(allDay, NOW)).toBe(false)
    expect(isOverdue(allDay, "2026-11-13T16:00:00.000Z")).toBe(true)
  })

  it("treats a follow-up as overdue once its time has passed", () => {
    const followUp = makeSchedule({ kind: "follow_up", starts_at: "2026-11-13T05:00:00.000Z", ends_at: null })
    expect(isOverdue(followUp, NOW)).toBe(true)
  })

  it("writes the day and WITA time with its label", () => {
    expect(whenLabel(makeSchedule({ starts_at: "2026-11-18T02:00:00.000Z", ends_at: "2026-11-18T03:00:00.000Z" }))).toBe(
      "Wed, 18 Nov · 10:00 to 11:00 WITA",
    )
    expect(whenLabel(makeSchedule({ kind: "follow_up", starts_at: "2026-11-17T01:30:00.000Z", ends_at: null }))).toBe(
      "Tue, 17 Nov · 09:30 WITA",
    )
    expect(whenLabel(makeSchedule({ all_day: true, starts_at: "2027-01-04T16:00:00.000Z" }), TODAY)).toBe(
      "Tue, 5 Jan 2027 · All day",
    )
    expect(dayHeading("2026-11-14", TODAY)).toBe("Tomorrow, Sat 14 Nov")
  })
})

describe("AI bookings", () => {
  it("marks the assistant's bookings, and asks to confirm only while unconfirmed and scheduled", () => {
    expect(aiBooking(makeSchedule())).toBe("none")
    expect(aiBooking(makeSchedule({ booked_via: "whatsapp_ai" }))).toBe("toConfirm")
    expect(aiBooking(makeSchedule({ booked_via: "whatsapp_ai", confirmed_at: "2026-11-13T02:00:00.000Z" }))).toBe("booked")
    expect(aiBooking(makeSchedule({ booked_via: "whatsapp_ai", status: "done" }))).toBe("booked")
  })
})

describe("time zones", () => {
  // 10:00 to 11:00 WIB on 18 Nov is 11:00 to 12:00 in Bali.
  const wib = makeSchedule({ time_zone: "Asia/Jakarta", starts_at: "2026-11-18T03:00:00.000Z", ends_at: "2026-11-18T04:00:00.000Z" })
  // 08:00 WIT on 19 Nov is 07:00 in Bali, still 19 Nov.
  const wit = makeSchedule({ time_zone: "Asia/Jayapura", kind: "call", starts_at: "2026-11-18T23:00:00.000Z", ends_at: "2026-11-18T23:30:00.000Z" })
  // 23:30 WIB on 18 Nov is already 00:30 on 19 Nov in Bali.
  const lateWib = makeSchedule({ time_zone: "Asia/Jakarta", kind: "follow_up", starts_at: "2026-11-18T16:30:00.000Z", ends_at: null })
  const bali = makeSchedule({ starts_at: "2026-11-19T01:00:00.000Z", ends_at: "2026-11-19T02:00:00.000Z" })

  it("labels the customer's time and adds the Bali time only when the zone is not WITA", () => {
    expect(timeLabel(wib)).toBe("10:00 to 11:00 WIB")
    expect(officeTimeLabel(wib)).toBe("11:00 to 12:00 WITA")
    expect(whenText(wib)).toBe("Wed, 18 Nov · 10:00 to 11:00 WIB (11:00 to 12:00 WITA in Bali)")
    expect(timeLabel(wit)).toBe("08:00 to 08:30 WIT")
    expect(officeTimeLabel(wit)).toBe("07:00 to 07:30 WITA")
    expect(officeTimeLabel(bali)).toBeNull()
    expect(whenText(bali)).toBe("Thu, 19 Nov · 09:00 to 10:00 WITA")
  })

  it("names the Bali day when it is another one than the customer's", () => {
    expect(whenLabel(lateWib)).toBe("Wed, 18 Nov · 23:30 WIB")
    expect(officeTimeLabel(lateWib)).toBe("Thu, 19 Nov, 00:30 WITA")
  })

  it("groups staff lists by the Bali office day, soonest first across zones", () => {
    const groups = byDay([bali, lateWib, wit, wib])
    expect(groups.map((group) => group.day)).toEqual(["2026-11-18", "2026-11-19"])
    expect(groups[0].items.map((item) => item.id)).toEqual([wib.id])
    // 00:30 WITA (the late WIB follow-up), 07:00 WITA (WIT call), 09:00 WITA.
    expect(groups[1].items.map((item) => item.id)).toEqual([lateWib.id, wit.id, bali.id])
    expect(onDay([lateWib], "2026-11-18")).toEqual([])
  })

  it("files the month grid by the Bali day", () => {
    const cells = monthGrid("2026-11", TODAY, [lateWib, wit], NOW).flat()
    expect(cells.find((cell) => cell.day === "2026-11-18")?.count).toBe(0)
    expect(cells.find((cell) => cell.day === "2026-11-19")?.count).toBe(2)
  })

  it("ends an all-day item at midnight in the booking's own zone", () => {
    const wibDay = makeSchedule({ time_zone: "Asia/Jakarta", all_day: true, starts_at: "2026-11-12T17:00:00.000Z", ends_at: "2026-11-13T17:00:00.000Z" })
    expect(wibDay.day).toBe("2026-11-13")
    // 13 Nov 16:30 UTC: past midnight in Bali, still 23:30 on 13 Nov in Jakarta.
    expect(isOverdue(wibDay, "2026-11-13T16:30:00.000Z")).toBe(false)
    expect(isOverdue(wibDay, "2026-11-13T17:00:00.000Z")).toBe(true)
  })
})
