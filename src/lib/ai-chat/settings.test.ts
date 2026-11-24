import { describe, expect, it } from "vitest"
import {
  isKnowledgePath,
  knowledgeMimeType,
  knowledgePath,
  parseAutoChat,
  parseHandover,
  parseKeywords,
  parsePersona,
  parseRule,
  validateKnowledgeFile,
} from "./settings"

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

describe("parseAutoChat", () => {
  it("needs a model before auto chat can be switched on", () => {
    expect(parseAutoChat(form({ enabled: "on", model: "" }))).toMatchObject({ ok: false })
    expect(parseAutoChat(form({ enabled: "on", model: "gpt-4o-mini" }))).toEqual({
      ok: true,
      value: { enabled: true, model: "gpt-4o-mini" },
    })
  })

  it("stores an empty model as null when off and refuses spaces", () => {
    expect(parseAutoChat(form({ model: "" }))).toEqual({ ok: true, value: { enabled: false, model: null } })
    expect(parseAutoChat(form({ model: "gpt 4" }))).toMatchObject({ ok: false })
  })
})

describe("parsePersona", () => {
  const base = { persona_name: "FSI Assistant", tone: "natural", language_mode: "auto" }

  it("drops custom tone text unless the tone is custom", () => {
    const parsed = parsePersona(form({ ...base, tone_custom: "left over" }))
    expect(parsed).toMatchObject({ ok: true, value: { tone: "natural", tone_custom: null } })
  })

  it("requires a description for a custom tone and a known language", () => {
    const parsed = parsePersona(form({ ...base, tone: "custom", language_mode: "fr" }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["language_mode", "tone_custom"])
  })
})

describe("parseHandover", () => {
  it("splits, lowercases and dedupes keywords", () => {
    expect(parseKeywords("Refund, refund\nGaransi,, \n")).toEqual(["refund", "garansi"])
  })

  it("accepts 1 to 10 failed answers only", () => {
    expect(parseHandover(form({ handover_max_failed_answers: "0" })).ok).toBe(false)
    expect(parseHandover(form({ handover_max_failed_answers: "2.5" })).ok).toBe(false)
    expect(parseHandover(form({ handover_max_failed_answers: "3", handover_on_human_request: "on" }))).toMatchObject({
      ok: true,
      value: { handover_max_failed_answers: 3, handover_on_human_request: true, handover_keywords: [] },
    })
  })
})

describe("parseRule", () => {
  it("only targets stored lead statuses and never sets auto_move", () => {
    expect(parseRule(form({ name: "x", trigger_description: "y", target_status: "Site Survey" })).ok).toBe(false)
    expect(
      parseRule(form({ name: "Price", trigger_description: "Asks for a price", target_status: "Quotation", auto_move: "on" })),
    ).toMatchObject({ ok: true, value: { target_status: "Quotation", auto_move: false, enabled: false } })
  })
})

describe("knowledge files", () => {
  it("accepts the bucket's types and refuses others, empty and oversized files", () => {
    expect(validateKnowledgeFile({ name: "a.pdf", type: "application/pdf", size: 10 })).toBeNull()
    expect(validateKnowledgeFile({ name: "a.txt", type: "", size: 10 })).toBeNull()
    expect(validateKnowledgeFile({ name: "a.exe", type: "application/x-msdownload", size: 10 })).not.toBeNull()
    expect(validateKnowledgeFile({ name: "a.pdf", type: "application/pdf", size: 0 })).not.toBeNull()
    expect(validateKnowledgeFile({ name: "a.pdf", type: "application/pdf", size: 21 * 1024 * 1024 })).not.toBeNull()
  })

  it("fills a missing mime type from the extension", () => {
    expect(knowledgeMimeType({ name: "Prices.DOCX", type: "" })).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  })

  it("builds safe paths and recognises only its own", () => {
    const path = knowledgePath("Price list (2026).pdf")
    expect(isKnowledgePath(path)).toBe(true)
    expect(isKnowledgePath("../customer-documents/1/x.pdf")).toBe(false)
    expect(isKnowledgePath("files/a/b.pdf")).toBe(false)
  })
})
