import { describe, expect, it } from "vitest"
import { toCsv } from "./csv"

describe("toCsv", () => {
  it("quotes every cell, doubles quotes and ends lines with CRLF", () => {
    expect(toCsv(["Name", "Business"], [["Made \"Wayan\"", "Villa, Ubud"]])).toBe(
      '"Name","Business"\r\n"Made ""Wayan""","Villa, Ubud"\r\n',
    )
  })

  it("writes empty cells for missing values", () => {
    expect(toCsv(["A", "B"], [[null, undefined]])).toBe('"A","B"\r\n"",""\r\n')
  })

  it("keeps phone numbers that start with + or - and a digit", () => {
    expect(toCsv(["Phone"], [["+62 812 3456 789"]])).toBe('"Phone"\r\n"+62 812 3456 789"\r\n')
  })

  it("neutralises cells a spreadsheet would run as a formula", () => {
    expect(toCsv(["X"], [["=HYPERLINK(1)"], ["@SUM(A1)"], ["+A1"]])).toBe(
      "\"X\"\r\n\"'=HYPERLINK(1)\"\r\n\"'@SUM(A1)\"\r\n\"'+A1\"\r\n",
    )
  })
})
