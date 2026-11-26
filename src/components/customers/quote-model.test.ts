import { describe, expect, it } from "vitest"
import { quoteRows, quoteSubmittedAt, quoteView } from "./quote-model"

const details = {
  site_type: "other",
  site_type_other: "Warehouse",
  installation_type: "ongrid",
  monthly_cost: 2500000,
  monthly_cost_unit: "Rp",
  reduction_percent: 60,
  meter_phase: "3",
  latitude: -8.65,
  longitude: 115.2167,
  maps_link: "https://www.google.com/maps?q=-8.650000,115.216700",
  address: "Jl. Test 1, Canggu",
  language: "id",
  message: "Call after 5pm",
  submitted_at: "2026-11-26T06:03:00.000Z",
}

describe("quoteRows", () => {
  it("lists the answers in form order with readable values", () => {
    expect(quoteRows(details)).toEqual([
      { label: "Site", value: "Other (Warehouse)" },
      { label: "Installation", value: "On-grid" },
      { label: "Monthly cost", value: "Rp 2.500.000" },
      { label: "Wants to cut", value: "60%" },
      { label: "PLN meter", value: "3 phase" },
      { label: "Address", value: "Jl. Test 1, Canggu" },
      { label: "Language", value: "Indonesian" },
      { label: "Message", value: "Call after 5pm" },
    ])
    expect(quoteSubmittedAt(details)).toBe("2026-11-26T06:03:00.000Z")
  })

  it("skips missing answers", () => {
    expect(quoteRows({ meter_phase: "unsure" })).toEqual([{ label: "PLN meter", value: "Not sure" }])
  })

  it("shows GPS as a location row only when there is no address", () => {
    expect(quoteRows({ maps_link: details.maps_link, latitude: -8.65, longitude: 115.2167 })).toEqual([
      { label: "Location", value: "-8.65000, 115.21670" },
    ])
  })

  it("gives nothing for a lead without quote details", () => {
    expect(quoteRows(null)).toEqual([])
    expect(quoteRows([1, 2])).toEqual([])
    expect(quoteRows("text")).toEqual([])
    expect(quoteSubmittedAt(null)).toBeNull()
  })
})

describe("quoteView", () => {
  it("lifts cost and reduction into the headline and keeps the rest as rows", () => {
    const view = quoteView(details)
    expect(view?.cost).toBe("Rp 2.500.000")
    expect(view?.reduction).toBe(60)
    expect(view?.rows.map((row) => row.label)).toEqual(["Site", "Installation", "PLN meter", "Address", "Language", "Message"])
    expect(view?.mapHref).toBe(details.maps_link)
  })

  it("offers the map button only for a shared GPS position, and only to Google Maps", () => {
    expect(quoteView({ address: "Jl. Raya Ubud 5" })?.mapHref).toBeNull()
    expect(quoteView({ address: "Jl. A", maps_link: "https://evil.example/x" })?.mapHref).toBeNull()
    expect(quoteView({ address: "Jl. A", maps_link: "https://www.google.com/maps?q=1,2&x=<script>" })?.mapHref).toBeNull()
    expect(quoteView(null)).toBeNull()
  })
})
