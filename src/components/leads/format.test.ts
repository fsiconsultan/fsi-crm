import { describe, expect, it } from "vitest"
import { addDays, today } from "@/lib/leads/dates"
import { displayPhone, nextStep, telHref, whatsappHref } from "./format"

describe("phone links", () => {
  it.each([
    ["812 3456 7890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["0812-3456-7890", "6281234567890"],
    ["62812 3456 7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["0033 6 12 34 56 78", "33612345678"],
    ["+33 6 12 34 56 78", "33612345678"],
    ["+81 90 1234 5678", "819012345678"],
    ["+86 138 0013 8000", "8613800138000"],
    ["0812 3456 7890 / 0813 1111 2222", "6281234567890"],
    ["081234567890/081311112222", "6281234567890"],
  ])("reads %s as %s", (raw, digits) => {
    expect(whatsappHref(raw)).toBe(`https://wa.me/${digits}`)
    expect(telHref(raw)).toBe(`tel:+${digits}`)
  })

  it.each([null, "", "-", "123", "0812", "+81 12"])("gives no link for %s", (raw) => {
    expect(whatsappHref(raw)).toBeNull()
    expect(telHref(raw)).toBeNull()
  })
})

describe("displayPhone", () => {
  it.each([
    ["081234567890", "+62 812 3456 7890"],
    ["'081337774426", "+62 813 3777 4426"],
    ["81916797188", "+62 819 1679 7188"],
    ["6281234567890", "+62 812 3456 7890"],
    ["+62 812-3456-7890", "+62 812 3456 7890"],
    ["0812 3456 7890 / 0813 1111 2222", "+62 812 3456 7890"],
    ["+33 6 12 34 56 78", "+33612345678"],
  ])("formats %s as %s", (raw, text) => {
    expect(displayPhone(raw)).toEqual({ text, readable: true })
  })

  it("keeps a value it cannot read as typed, marked unreadable", () => {
    expect(displayPhone(" 0812 ")).toEqual({ text: "0812", readable: false })
    expect(displayPhone("0361 ext 2")).toEqual({ text: "0361 ext 2", readable: false })
  })

  it.each([null, "", "   ", "-", "n/a"])("shows nothing for %j", (raw) => {
    expect(displayPhone(raw)).toBeNull()
  })
})

describe("nextStep", () => {
  const base = { status: "Quotation", status_started_at: null, follow_up_date: null }

  it("flags an overdue follow-up on an open lead", () => {
    expect(nextStep({ ...base, follow_up_date: addDays(today(), -3) }).tone).toBe("overdue")
  })

  it("ignores a past follow-up once the lead is decided", () => {
    expect(nextStep({ ...base, status: "Deal", follow_up_date: addDays(today(), -3) })).toEqual({
      text: "Status date unknown",
      tone: "quiet",
    })
  })

  it("says how long a lead has sat in its status", () => {
    const started = new Date(Date.now() - 5 * 86_400_000).toISOString()
    expect(nextStep({ ...base, status_started_at: started }).text).toMatch(/^In Quotation for [45] days$/)
  })

  it("says today and has a quiet line for no status", () => {
    expect(nextStep({ ...base, follow_up_date: today() })).toEqual({ text: "Follow up today", tone: "today" })
    expect(nextStep({ ...base, status: null })).toEqual({ text: "No follow-up set", tone: "quiet" })
  })
})
