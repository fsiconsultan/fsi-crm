import { describe, expect, it } from "vitest"
import { decideLegacyDate, type LegacySchedule } from "./legacy"

const TODAY = "2026-11-13"
const at = (day: string, status = "scheduled", previous: string | null = null): LegacySchedule => ({
  status,
  starts_at: `${day}T02:00:00.000Z`,
  previous_starts_at: previous ? `${previous}T02:00:00.000Z` : null,
})

describe("legacy date rule", () => {
  it("fills an empty column with the soonest upcoming scheduled day", () => {
    expect(decideLegacyDate(null, [at("2026-11-25"), at("2026-11-20")], TODAY)).toEqual({ action: "set", value: "2026-11-20" })
  })

  it("never overwrites an upcoming date typed by hand", () => {
    expect(decideLegacyDate("2026-12-01", [at("2026-11-20")], TODAY)).toEqual({ action: "kept_manual" })
    expect(decideLegacyDate("2026-11-15", [at("2026-11-20")], TODAY)).toEqual({ action: "kept_manual" })
  })

  it("replaces a past date and a date it wrote itself", () => {
    expect(decideLegacyDate("2026-10-01", [at("2026-11-20")], TODAY)).toEqual({ action: "set", value: "2026-11-20" })
    expect(decideLegacyDate("2026-11-20", [at("2026-11-24", "scheduled", "2026-11-20")], TODAY)).toEqual({
      action: "set",
      value: "2026-11-24",
    })
  })

  it("clears its own date after a cancel, keeps it after done, leaves a past manual date", () => {
    expect(decideLegacyDate("2026-11-20", [at("2026-11-20", "cancelled")], TODAY)).toEqual({ action: "set", value: null })
    expect(decideLegacyDate("2026-11-20", [at("2026-11-20", "done")], TODAY)).toEqual({ action: "unchanged" })
    expect(decideLegacyDate("2026-10-01", [at("2026-11-20", "cancelled")], TODAY)).toEqual({ action: "unchanged" })
  })

  it("ignores scheduled items before today", () => {
    expect(decideLegacyDate(null, [at("2026-11-10")], TODAY)).toEqual({ action: "unchanged" })
  })
})
