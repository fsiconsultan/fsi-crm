import { describe, expect, it } from "vitest"
import { NO_FILTERS, activeChips, leadWhere, noStatusHref, parsePipelineFilters, pipelineHref } from "./filters"

const SALES = "0b0f6a52-1c3e-4f6d-9a57-2d1f1a7c9e10"

describe("pipeline filters in the URL", () => {
  it("reads every filter and writes the same URL back", () => {
    const filters = parsePipelineFilters({ q: " villa ", sales: SALES, type: "Partner", mover: "ai", added: "30", stuck: "1", due: "1" })
    expect(filters).toEqual({ q: "villa", sales: SALES, type: "Partner", mover: "ai", added: "30", stuck: true, due: true })
    expect(parsePipelineFilters(Object.fromEntries(new URL(pipelineHref(filters), "http://x").searchParams))).toEqual(filters)
  })

  it("drops values it does not know instead of failing", () => {
    expect(parsePipelineFilters({ sales: "me", type: "VIP", mover: "robot", added: "365", stuck: "yes" })).toEqual(NO_FILTERS)
    expect(pipelineHref(NO_FILTERS)).toBe("/pipeline")
  })

  it("lists active filters as chips whose link removes only that filter", () => {
    const filters = { ...NO_FILTERS, type: "Customer" as const, stuck: true }
    expect(activeChips(filters, null)).toEqual([
      { key: "type", label: "Customer", removeHref: "/pipeline?stuck=1" },
      { key: "stuck", label: "Stuck over 14 days", removeHref: "/pipeline?type=Customer" },
    ])
    expect(activeChips({ ...NO_FILTERS, sales: SALES }, "Killian")[0].label).toBe("Killian")
  })
})

describe("pipeline filters as lead conditions", () => {
  it("uses the leads list's own views for the toggles, and counts today in the added range", () => {
    const where = leadWhere({ ...NO_FILTERS, added: "7", stuck: true, due: true }, "Quotation", "2026-11-13")
    expect(where).toMatchObject({ status: "Quotation", from: "2026-11-07", views: ["stale", "followup"] })
  })

  it("links the no-status leads with the same filters, or not at all when a filter excludes them", () => {
    expect(noStatusHref(NO_FILTERS, "2026-11-13")).toBe("/leads?status=none")
    expect(noStatusHref({ ...NO_FILTERS, type: "Partner", due: true }, "2026-11-13")).toBe(
      "/leads?status=none&type=Partner&view=followup",
    )
    expect(noStatusHref({ ...NO_FILTERS, stuck: true }, "2026-11-13")).toBeNull()
    expect(noStatusHref({ ...NO_FILTERS, mover: "person" }, "2026-11-13")).toBeNull()
  })
})
