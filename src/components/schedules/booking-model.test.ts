import { describe, expect, it } from "vitest"
import type { ScheduleActionResult } from "@/lib/schedules/types"
import {
  bookingErrorMessage,
  cancelEmailNote,
  createValues,
  emailChoice,
  hasWarnings,
  officeTimeLine,
  rescheduleValues,
  summarizeResult,
  toCreateInput,
  toRescheduleInput,
  validateBooking,
  withKind,
  zoneHint,
  type BookingLead,
} from "./booking-model"
import { makeSchedule } from "./fixtures"

const TODAY = "2026-11-13"
// 13 Nov 2026, 14:00 in Bali.
const NOW = new Date("2026-11-13T06:00:00.000Z")
const LEAD: BookingLead = { id: 4465, name: "Ibu Sari", location: " Canggu ", email: "sari@example.com", salesId: "s-1" }

describe("booking form values", () => {
  it("starts on today with the lead's place and salesperson", () => {
    expect(createValues(LEAD, TODAY)).toMatchObject({
      kind: "appointment",
      date: TODAY,
      title: "Appointment: Ibu Sari",
      location: "Canggu",
      salesId: "s-1",
      notifyLead: false,
    })
  })

  it("follows the kind in the title until the user types their own", () => {
    const start = createValues(LEAD, TODAY)
    expect(withKind(start, "site_survey", LEAD.name).title).toBe("Site survey: Ibu Sari")
    const typed = { ...start, title: "Roof check" }
    expect(withKind(typed, "call", LEAD.name).title).toBe("Roof check")
    expect(withKind({ ...start, endTime: "11:00" }, "follow_up", LEAD.name).endTime).toBe("")
  })
})

describe("client-side validation", () => {
  const base = { ...createValues(LEAD, TODAY), startTime: "10:00" }

  it("accepts a valid booking", () => {
    expect(validateBooking("create", base, NOW)).toEqual({})
  })

  it("refuses a past date and a missing start time", () => {
    expect(validateBooking("create", { ...base, date: "2026-11-12" }, NOW)).toEqual({ date: "Pick today or a later date." })
    expect(validateBooking("create", { ...base, startTime: "" }, NOW).startTime).toMatch(/start time/)
  })

  it("refuses an end before the start", () => {
    expect(validateBooking("create", { ...base, endTime: "09:00" }, NOW).endTime).toMatch(/after the start/)
  })

  it("ignores times for an all-day item and the end time of a follow-up", () => {
    expect(validateBooking("create", { ...base, allDay: true, startTime: "" }, NOW)).toEqual({})
    expect(validateBooking("create", { ...base, kind: "follow_up", endTime: "09:00" }, NOW)).toEqual({})
  })

  it("limits text length on create only", () => {
    const long = { ...base, notes: "x".repeat(2001) }
    expect(validateBooking("create", long, NOW).notes).toBe("Keep this under 2000 characters.")
    expect(validateBooking("reschedule", long, NOW)).toEqual({})
  })
})

describe("inputs sent to the server", () => {
  it("sends the salesperson only for an Admin with the list loaded", () => {
    const values = { ...createValues(LEAD, TODAY), startTime: "10:00", endTime: "11:30", salesId: "" }
    expect(toCreateInput(LEAD.id, values, { admin: true, canPickSales: true })).toMatchObject({
      leadId: 4465,
      kind: "appointment",
      startTime: "10:00",
      endTime: "11:30",
      allDay: false,
      timeZone: "Asia/Makassar",
      salesId: null,
      notifyLead: false,
    })
    expect(toCreateInput(LEAD.id, values, { admin: false, canPickSales: true })).not.toHaveProperty("salesId")
    expect(toCreateInput(LEAD.id, values, { admin: true, canPickSales: false })).not.toHaveProperty("salesId")
  })

  it("drops times for all day and the end for a follow-up, and blank text", () => {
    const allDay = toCreateInput(1, { ...createValues(LEAD, TODAY), allDay: true, startTime: "10:00", notes: "  " }, { admin: false, canPickSales: false })
    expect(allDay).not.toHaveProperty("startTime")
    expect(allDay.notes).toBeUndefined()
    const followUp = toCreateInput(1, { ...createValues(LEAD, TODAY), kind: "follow_up", startTime: "09:00", endTime: "10:00" }, { admin: false, canPickSales: false })
    expect(followUp).toMatchObject({ startTime: "09:00" })
    expect(followUp).not.toHaveProperty("endTime")
  })

  it("reschedules with the loaded updatedAt", () => {
    const item = makeSchedule({ notify_lead: true })
    const values = rescheduleValues(item, true)
    expect(values).toMatchObject({ date: "2026-11-18", startTime: "10:00", endTime: "11:00", notifyLead: true })
    expect(rescheduleValues(item, false).notifyLead).toBe(false)
    expect(toRescheduleInput(item, { ...values, date: "2026-11-19" })).toEqual({
      scheduleId: item.id,
      loadedUpdatedAt: item.updatedAt,
      date: "2026-11-19",
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      timeZone: "Asia/Makassar",
      notifyLead: true,
    })
  })
})

describe("email choice", () => {
  it("says why the lead cannot be emailed", () => {
    expect(emailChoice("sari@example.com", false)).toEqual({ available: false, reason: expect.stringMatching(/not set up/) })
    expect(emailChoice(null, true)).toEqual({ available: false, reason: expect.stringMatching(/no email address/) })
    expect(emailChoice("sari@", true)).toEqual({ available: false, reason: expect.stringMatching(/not valid/) })
    expect(emailChoice(" sari@example.com ", true)).toEqual({ available: true, to: "sari@example.com" })
  })

  it("only promises a cancellation email to a lead who got the invitation", () => {
    const notInvited = makeSchedule()
    expect(cancelEmailNote(notInvited, true)).toMatch(/will not be emailed/)
    const invited = makeSchedule({
      notify_lead: true,
      email_status: "sent",
      email_sent_at: "2026-11-13T01:00:00.000Z",
      lead_email_snapshot: "sari@example.com",
    })
    expect(cancelEmailNote(invited, true)).toBe("sari@example.com got the invitation, so they will be emailed a cancellation.")
    expect(cancelEmailNote(invited, false)).toMatch(/no cancellation email can go out/)
  })
})

describe("result summary", () => {
  const schedule = makeSchedule()
  const result = (steps: Partial<Extract<ScheduleActionResult, { ok: true }>["steps"]>, recordError?: string) =>
    ({
      ok: true as const,
      message: "",
      schedule,
      steps: {
        legacy: { status: "updated", column: "appointment", value: "2026-11-18", message: "The lead's appointment date is now 2026-11-18." },
        google: { status: "not_connected", message: "Google Calendar is not connected, so no calendar event was made." },
        email: { status: "not_requested", message: "" },
        ...steps,
      },
      ...(recordError ? { recordError } : {}),
    }) satisfies ScheduleActionResult

  it("lists each step as one line, with not connected in amber", () => {
    const lines = summarizeResult(result({}), "create")
    expect(lines.map((line) => [line.key, line.tone])).toEqual([
      ["saved", "ok"],
      ["legacy", "ok"],
      ["google", "warn"],
      ["email", "info"],
    ])
    expect(lines[0].text).toBe("Saved in the CRM for Wed, 18 Nov · 10:00 to 11:00 WITA.")
    expect(lines[3].text).toBe("The lead was not emailed: you did not ask for it.")
    expect(hasWarnings(lines)).toBe(true)
  })

  it("shows failures in pink with the server's reason, and the record error", () => {
    const lines = summarizeResult(
      result(
        {
          google: { status: "failed", message: "Google Calendar was not updated: timeout" },
          email: { status: "failed", message: "The lead was not emailed: refused" },
        },
        "The outcome above could not be saved on the schedule (network down).",
      ),
      "reschedule",
    )
    expect(lines.filter((line) => line.tone === "fail").map((line) => line.key)).toEqual(["google", "email", "record"])
    expect(lines[0].text).toMatch(/^Moved in the CRM to /)
  })

  it("never claims a step that did not happen", () => {
    const lines = summarizeResult(
      result({
        legacy: { status: "skipped", column: null, value: null, message: "" },
        google: { status: "skipped", message: "" },
        email: { status: "not_requested", message: "" },
      }),
      "done",
    )
    expect(lines.slice(1).every((line) => line.tone === "info")).toBe(true)
    expect(lines.map((line) => line.text).join(" ")).not.toMatch(/synced|sent|updated/i)
    expect(hasWarnings(lines)).toBe(false)
  })

  it("marks a missing address and missing email setup as warnings", () => {
    const noAddress = summarizeResult(result({ email: { status: "no_address", message: "The lead has no email address, so no email was sent." } }), "create")
    expect(noAddress.find((line) => line.key === "email")?.tone).toBe("warn")
    const notSetUp = summarizeResult(result({ email: { status: "not_connected", message: "Email is not connected, so the lead was not emailed." } }), "create")
    expect(notSetUp.find((line) => line.key === "email")?.tone).toBe("warn")
  })
})

describe("time zone picker", () => {
  it("preselects the zone of a clear location, with no hint", () => {
    const jakarta = { ...LEAD, location: "Kebayoran, Jakarta Selatan" }
    expect(createValues(jakarta, TODAY).timeZone).toBe("Asia/Jakarta")
    expect(zoneHint(jakarta.location)).toBeNull()
    expect(createValues({ ...LEAD, location: "Sorong, Papua Barat Daya" }, TODAY).timeZone).toBe("Asia/Jayapura")
    expect(createValues(LEAD, TODAY).timeZone).toBe("Asia/Makassar")
    expect(zoneHint(LEAD.location)).toBeNull()
  })

  it("falls back to WITA and asks to check an unknown location", () => {
    for (const location of [null, "", "-", "zen villa"]) {
      expect(createValues({ ...LEAD, location }, TODAY).timeZone).toBe("Asia/Makassar")
      expect(zoneHint(location)).toBe("Location unknown or unclear, so this is set to WITA. Check the customer's city.")
    }
  })

  it("names the matched place for a location in more than one zone", () => {
    const mixed = { ...LEAD, location: "jakarta, bali" }
    expect(createValues(mixed, TODAY).timeZone).toBe("Asia/Jakarta")
    expect(zoneHint(mixed.location)).toBe("The location names places in more than one zone; matched Jakarta, please check.")
  })

  it("prefills a reschedule from the booking's zone and sends it back", () => {
    const item = makeSchedule({ time_zone: "Asia/Jakarta", starts_at: "2026-11-18T03:00:00.000Z", ends_at: "2026-11-18T04:00:00.000Z" })
    const values = rescheduleValues(item, false)
    expect(values).toMatchObject({ timeZone: "Asia/Jakarta", date: "2026-11-18", startTime: "10:00", endTime: "11:00" })
    expect(toRescheduleInput(item, values).timeZone).toBe("Asia/Jakarta")
  })

  it("sends the chosen zone with a new booking", () => {
    const values = { ...createValues(LEAD, TODAY), startTime: "10:00", timeZone: "Asia/Jayapura" as const }
    expect(toCreateInput(LEAD.id, values, { admin: false, canPickSales: false }).timeZone).toBe("Asia/Jayapura")
  })
})

describe("validation in the chosen zone", () => {
  // 13 Nov 16:30 UTC: 23:30 on 13 Nov in Jakarta (WIB), already 00:30 on 14 Nov in Bali.
  const NEAR_MIDNIGHT = new Date("2026-11-13T16:30:00.000Z")
  const late = { ...createValues(LEAD, TODAY), date: "2026-11-13", startTime: "23:45", endTime: "" }

  it("still allows today in WIB when Bali has moved on to tomorrow", () => {
    expect(validateBooking("create", { ...late, timeZone: "Asia/Jakarta" }, NEAR_MIDNIGHT)).toEqual({})
  })

  it("refuses the same day in WITA and WIT, where it is already tomorrow", () => {
    expect(validateBooking("create", { ...late, timeZone: "Asia/Makassar" }, NEAR_MIDNIGHT)).toEqual({ date: "Pick today or a later date." })
    expect(validateBooking("create", { ...late, timeZone: "Asia/Jayapura" }, NEAR_MIDNIGHT)).toEqual({ date: "Pick today or a later date." })
  })
})

describe("Bali time under the times", () => {
  const base = { kind: "appointment" as const, date: "2026-11-18", allDay: false }

  it("shows the typed times and the same times in Bali for WIB and WIT", () => {
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jakarta", startTime: "10:00", endTime: "11:00" })).toBe(
      "10:00 to 11:00 WIB · 11:00 to 12:00 WITA in Bali",
    )
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jayapura", startTime: "10:00", endTime: "" })).toBe("10:00 WIT · 09:00 WITA in Bali")
  })

  it("says when Bali is on another day", () => {
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jakarta", startTime: "23:30", endTime: "" })).toBe(
      "23:30 WIB · 00:30 WITA in Bali, the next day",
    )
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jayapura", startTime: "00:30", endTime: "" })).toBe(
      "00:30 WIT · 23:30 WITA in Bali, the day before",
    )
  })

  it("shows nothing for WITA, all day, or an unfinished time", () => {
    expect(officeTimeLine({ ...base, timeZone: "Asia/Makassar", startTime: "10:00", endTime: "11:00" })).toBeNull()
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jakarta", allDay: true, startTime: "10:00", endTime: "" })).toBeNull()
    expect(officeTimeLine({ ...base, timeZone: "Asia/Jakarta", startTime: "", endTime: "" })).toBeNull()
  })
})

describe("server refusals", () => {
  it("rewrites the missing time zone migration in plain words and passes others through", () => {
    const raw = "Nothing was saved: bookings outside Bali time (WITA) need the time zone migration (20261117090000) applied first."
    expect(bookingErrorMessage(raw, "Asia/Jakarta")).toBe(
      "Nothing was saved: bookings in WIB are not switched on yet (a database update is still pending). Ask the owner to apply it, or book in WITA for now.",
    )
    expect(bookingErrorMessage("Nothing was saved: timeout. Try again.", "Asia/Jakarta")).toBe("Nothing was saved: timeout. Try again.")
  })
})
