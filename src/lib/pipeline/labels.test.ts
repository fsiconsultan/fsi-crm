import { describe, expect, it } from "vitest"
import { sourceLabels } from "./labels"

describe("sourceLabels", () => {
  it("marks website quotes and WhatsApp leads, both when a lead has both", () => {
    expect(sourceLabels("website_quote", false)).toEqual(["web_quote"])
    expect(sourceLabels(null, true)).toEqual(["whatsapp"])
    expect(sourceLabels("website_quote", true)).toEqual(["web_quote", "whatsapp"])
  })

  it("gives no pill to staff-entered leads or website chat messages", () => {
    expect(sourceLabels(null, false)).toEqual([])
    expect(sourceLabels("website_chat", false)).toEqual([])
  })
})
