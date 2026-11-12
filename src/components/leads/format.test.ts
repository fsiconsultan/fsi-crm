import { describe, expect, it } from "vitest"
import { telHref, whatsappHref } from "./format"

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
