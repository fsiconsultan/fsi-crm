import { describe, expect, it } from "vitest"
import { LEAD_STATUSES } from "@/lib/leads/status"
import { columnOrder } from "./order"

describe("columnOrder", () => {
  it("puts the newest leads first in New, so a fresh website lead is on top", () => {
    expect(columnOrder("New")).toBe("newest_first")
  })

  it("keeps the longest in the status first in every other column", () => {
    for (const status of LEAD_STATUSES.filter((s) => s !== "New")) {
      expect(columnOrder(status)).toBe("oldest_first")
    }
  })
})
