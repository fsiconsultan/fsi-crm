import { describe, expect, it } from "vitest"
import { buildIcs, escapeText, foldLine, utcStamp, type IcsEvent } from "./ics"

const event: IcsEvent = {
  method: "REQUEST",
  uid: "abc@fsi-crm",
  sequence: 0,
  stamp: new Date("2026-11-13T02:00:00Z"),
  startsAt: "2026-11-20T02:00:00.000Z",
  endsAt: "2026-11-20T03:00:00.000Z",
  allDay: false,
  summary: "Site survey with French Solar Industry",
  organizer: { name: "French Solar Industry", email: "hello@fsi.example" },
  attendee: { name: "Pak Made", email: "made@example.com" },
}

const octets = (line: string) => new TextEncoder().encode(line).length

describe("iCalendar builder", () => {
  it("escapes backslash, semicolon, comma and line breaks", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf")
  })

  it("writes UTC times and CRLF line endings only", () => {
    const ics = buildIcs(event)
    expect(utcStamp("2026-11-20T02:00:00.000Z")).toBe("20261120T020000Z")
    expect(ics).toContain("DTSTART:20261120T020000Z\r\nDTEND:20261120T030000Z\r\n")
    expect(ics).toContain("DTSTAMP:20261113T020000Z\r\n")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/)
  })

  it("folds long lines at 75 octets without splitting a character", () => {
    const long = `DESCRIPTION:${"Survei lokasi di Ubud ✓ ".repeat(10)}`
    const folded = foldLine(long)
    const lines = folded.split("\r\n")
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(octets(line)).toBeLessThanOrEqual(75)
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true)
    expect(lines.map((line, i) => (i === 0 ? line : line.slice(1))).join("")).toBe(long)
    expect(foldLine("SHORT:line")).toBe("SHORT:line")
  })

  it("keeps every line of a full file within 75 octets", () => {
    const ics = buildIcs({ ...event, description: "x".repeat(300), location: "Jl. Raya, Ubud; Bali\nnear the market" })
    for (const line of ics.split("\r\n")) expect(octets(line)).toBeLessThanOrEqual(75)
    expect(ics).toContain("LOCATION:Jl. Raya\\, Ubud\\; Bali\\nnear the market")
  })

  it("marks a cancellation with the same UID and the given SEQUENCE", () => {
    const ics = buildIcs({ ...event, method: "CANCEL", sequence: 2 })
    expect(ics).toContain("METHOD:CANCEL\r\n")
    expect(ics).toContain("UID:abc@fsi-crm\r\n")
    expect(ics).toContain("SEQUENCE:2\r\n")
    expect(ics).toContain("STATUS:CANCELLED\r\n")
  })

  it("writes all-day items as Bali dates and strips quotes from names", () => {
    const ics = buildIcs({
      ...event,
      allDay: true,
      startsAt: "2026-11-19T16:00:00.000Z", // 00:00 on 20 Nov in Bali
      endsAt: "2026-11-20T16:00:00.000Z",
      attendee: { name: 'Made "Bli" Putra', email: "made@example.com" },
    })
    expect(ics).toContain("DTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261121\r\n")
    expect(ics.replace(/\r\n /g, "")).toContain('ATTENDEE;CN="Made Bli Putra";ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:made@example.com')
  })
})
