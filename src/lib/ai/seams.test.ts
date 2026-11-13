import { describe, expect, it } from "vitest"
import { calculateIndicativeSystem } from "./seams"

describe("calculate_indicative_system", () => {
  it("stays not configured and carries no figures", async () => {
    const result = await calculateIndicativeSystem({ monthly_pln_bill_idr: "Rp 4.000.000" })
    expect(result.status).toBe("not_configured")
    expect(JSON.stringify(result)).not.toMatch(/\d/)
  })
})
