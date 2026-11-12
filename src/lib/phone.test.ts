import { describe, expect, it } from "vitest"
import { formatPhone, matchLeadByPhone, normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["812 3456 7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["62812 34567890", "6281234567890"],
    ["(0812) 3456.7890", "6281234567890"],
    ["+62 0812 3456 7890", "6281234567890"],
    ["0062 812 3456 7890", "6281234567890"],
    ["WA: 0812 3456 7890", "6281234567890"],
  ])("turns %s into %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })

  it("uses the first number when a field holds several", () => {
    expect(normalizePhone("0812345678 / 0813999999")).toBe("62812345678")
  })

  it("keeps other country codes as they are", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("33612345678")
    expect(normalizePhone("61412345678")).toBe("61412345678")
  })

  it.each([null, undefined, "", "abc", "0", "81234567", "62812", "1234567890123456"])(
    "returns null for %s",
    (raw) => {
      expect(normalizePhone(raw)).toBeNull()
    },
  )
})

describe("matchLeadByPhone", () => {
  const leads = [
    { id: 1, phone: "0812-3456-7890" },
    { id: 2, phone: "+62 813 1111 2222" },
    { id: 3, phone: "8131111 2222" },
    { id: 4, phone: null },
  ]

  it("finds the one lead with the number, whatever its format", () => {
    expect(matchLeadByPhone(leads, "6281234567890")).toEqual({ kind: "unique", lead: leads[0] })
  })

  it("reports ambiguity instead of picking a lead when several share the number", () => {
    const match = matchLeadByPhone(leads, "6281311112222")
    expect(match.kind).toBe("ambiguous")
    expect(match.kind === "ambiguous" && match.leads.map((l) => l.id)).toEqual([2, 3])
  })

  it("reports no match for an unknown or unusable number", () => {
    expect(matchLeadByPhone(leads, "6289999999999")).toEqual({ kind: "none" })
    expect(matchLeadByPhone(leads, "")).toEqual({ kind: "none" })
  })

  it("prefers the stored phone_wa over re-reading phone", () => {
    const stored = [{ id: 9, phone: "see notes", phone_wa: "6281234567890" }]
    expect(matchLeadByPhone(stored, "+62 812 3456 7890")).toEqual({ kind: "unique", lead: stored[0] })
  })
})

describe("formatPhone", () => {
  it("groups an Indonesian number for display", () => {
    expect(formatPhone("6281234567890")).toBe("+62 812 3456 7890")
  })
  it("prefixes other numbers with +", () => {
    expect(formatPhone("33612345678")).toBe("+33612345678")
  })
})
