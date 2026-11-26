import { describe, expect, it } from "vitest"
import { DEFAULT_FILTERS, parseLeadFilters, type LeadFilters } from "./filters"
import { QUICK_VIEWS, activeQuickView, addedLabel, leadChips, quickViewHref, quickViewWhere } from "./quick-views"

const TODAY = "2026-11-13"
const filters = (patch: Partial<LeadFilters>): LeadFilters => ({ ...DEFAULT_FILTERS, ...patch })
const tab = (key: string) => QUICK_VIEWS.find((view) => view.key === key)!

describe("quick views", () => {
  it("map to the same filters the Overview counts with", () => {
    const where = (key: string) => {
      const { view, status } = quickViewWhere(tab(key), DEFAULT_FILTERS)
      return { view, status }
    }
    expect(where("all")).toEqual({ view: "", status: "" })
    expect(where("followup")).toEqual({ view: "followup", status: "" })
    expect(where("stale")).toEqual({ view: "stale", status: "" })
    expect(where("pipeline")).toEqual({ view: "pipeline", status: "" })
    expect(where("none")).toEqual({ view: "", status: "none" })
    expect(where("deals")).toEqual({ view: "", status: "Deal" })
  })

  it("keep the other filters in the count and drop sort and page", () => {
    const where = quickViewWhere(tab("followup"), filters({ q: "villa", type: "Partner", status: "Quotation", page: 4 }))
    expect(where).toEqual({ q: "villa", sales: "", type: "Partner", from: "", to: "", sfrom: "", sto: "", view: "followup", status: "" })
  })

  it("build links that keep filters, reset the page and pick the tab's sort", () => {
    const current = filters({ q: "villa", page: 3 })
    expect(quickViewHref(tab("all"), current)).toBe("/leads?q=villa")
    expect(quickViewHref(tab("followup"), current)).toBe("/leads?q=villa&view=followup&sort=followup")
    expect(quickViewHref(tab("stale"), current)).toBe("/leads?q=villa&view=stale&sort=longest")
    expect(quickViewHref(tab("none"), current)).toBe("/leads?q=villa&status=none")
    expect(quickViewHref(tab("deals"), filters({ sort: "name" }))).toBe("/leads?status=Deal&sort=name")
    // Leaving the follow-up tab drops its sort instead of carrying it to All.
    expect(quickViewHref(tab("all"), filters({ view: "followup", sort: "followup" }))).toBe("/leads")
  })

  it("light the tab the Overview links open", () => {
    const active = (query: Record<string, string>) => activeQuickView(parseLeadFilters(query))?.key ?? null
    expect(active({})).toBe("all")
    expect(active({ view: "followup", sort: "followup" })).toBe("followup")
    expect(active({ view: "stale", sort: "longest" })).toBe("stale")
    expect(active({ status: "none" })).toBe("none")
    expect(active({ status: "Deal" })).toBe("deals")
    expect(active({ view: "undated" })).toBeNull()
    expect(active({ status: "Quotation" })).toBeNull()
  })

  it("open on newest added by default", () => {
    expect(parseLeadFilters({}).sort).toBe("newest")
    expect(parseLeadFilters({ sort: "bogus" }).sort).toBe("newest")
  })
})

describe("filter chips", () => {
  it("show a status or view only when no tab explains it", () => {
    expect(leadChips(filters({ status: "Deal" }), null, TODAY)).toEqual([])
    expect(leadChips(filters({ status: "Quotation" }), null, TODAY).map((chip) => chip.label)).toEqual(["Status: Quotation"])
    expect(leadChips(filters({ view: "undated" }), null, TODAY)[0]).toEqual({
      key: "view",
      label: "Status date missing",
      removeHref: "/leads",
    })
  })

  it("remove one filter at a time and go back to page 1", () => {
    const chips = leadChips(filters({ q: "bali", type: "Partner", from: "2026-11-07", page: 2 }), null, TODAY)
    expect(chips.map((chip) => [chip.label, chip.removeHref])).toEqual([
      ["Search: bali", "/leads?type=Partner&from=2026-11-07"],
      ["Partner", "/leads?q=bali&from=2026-11-07"],
      ["Added: Last 7 days", "/leads?q=bali&type=Partner"],
    ])
  })
})

describe("addedLabel", () => {
  it.each([
    ["", "", "Any time"],
    ["2026-11-07", "", "Last 7 days"],
    ["2026-10-15", "", "Last 30 days"],
    ["2026-08-16", "", "Last 90 days"],
    ["2026-11-01", "2026-11-10", "1 Nov to 10 Nov"],
    ["2026-11-01", "", "Since 1 Nov"],
    ["", "2025-12-31", "Until 31 Dec 2025"],
  ])("%s to %s reads %s", (from, to, label) => {
    expect(addedLabel(from, to, TODAY)).toBe(label)
  })
})
