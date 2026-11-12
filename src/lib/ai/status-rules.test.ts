import { describe, expect, it } from "vitest"
import { createMemoryStore } from "@/lib/whatsapp/testing/memory-store"
import type { LeadRef } from "@/lib/whatsapp/types"
import { applyStatusEvent } from "./status-rules"

const NOW = new Date("2026-11-12T03:00:00Z")
const lead = (status: string | null): LeadRef => ({
  id: 1,
  customer_name: "Test",
  phone: "0812-0000-0001",
  phone_wa: "6281200000001",
  status,
  sales_id: null,
})

function apply(db: ReturnType<typeof createMemoryStore>, event = "qualification_completed") {
  return applyStatusEvent({ store: db.store, leadId: 1, event, conversationId: null, now: NOW })
}

// The automation set "New" when it created the lead.
async function automationCreated(db: ReturnType<typeof createMemoryStore>) {
  await db.store.logEvent({ type: "lead_created", leadId: 1, summary: "created", detail: { to: "New" } })
}

describe("guarded status change", () => {
  it("moves a lead the automation created from New to First Contact and logs it", async () => {
    const db = createMemoryStore({ leads: [lead("New")] })
    await automationCreated(db)

    expect(await apply(db)).toEqual({ outcome: "changed", from: "New", to: "First Contact" })
    expect(db.leads[0].status).toBe("First Contact")
    expect(db.events.at(-1)).toMatchObject({
      type: "status_changed",
      needs_review: false,
      detail: { event: "qualification_completed", from: "New", to: "First Contact" },
    })
  })

  it("refuses to overwrite a status a person set, and logs the refusal for review", async () => {
    // Same status the rule accepts, but no record that the automation set it: a person did.
    const db = createMemoryStore({ leads: [lead("New")] })

    const result = await apply(db)

    expect(result.outcome).toBe("refused")
    expect(db.leads[0].status).toBe("New")
    expect(db.events).toEqual([
      expect.objectContaining({ type: "status_change_refused", needs_review: true, lead_id: 1 }),
    ])
  })

  it("refuses when a person changed the status after the automation set it", async () => {
    const db = createMemoryStore({ leads: [lead("New")] })
    await automationCreated(db)
    db.leads[0].status = "Quotation" // a salesperson moved it on by hand

    expect((await apply(db)).outcome).toBe("refused")
    expect(db.leads[0].status).toBe("Quotation")
    expect(db.events.at(-1)).toMatchObject({ type: "status_change_refused", needs_review: true })
  })

  it("never writes a status onto a lead that has none", async () => {
    const db = createMemoryStore({ leads: [lead(null)] })
    expect((await apply(db)).outcome).toBe("refused")
    expect(db.leads[0].status).toBeNull()
  })

  it("does nothing, and logs nothing, when the lead is already at the target status", async () => {
    const db = createMemoryStore({ leads: [lead("First Contact")] })
    expect(await apply(db)).toEqual({ outcome: "unchanged", status: "First Contact" })
    expect(db.events).toHaveLength(0)
  })

  it("refuses when the status changes between the read and the write", async () => {
    const db = createMemoryStore({ leads: [lead("New")] })
    await automationCreated(db)
    const original = db.store.updateLeadStatus
    db.store.updateLeadStatus = async (...args) => {
      db.leads[0].status = "No Deal" // a person got there first
      return original(...args)
    }

    expect((await apply(db)).outcome).toBe("refused")
    expect(db.leads[0].status).toBe("No Deal")
  })

  it("logs an undefined event, a missing lead and a database error as failures for review", async () => {
    const db = createMemoryStore({ leads: [lead("New")] })
    await automationCreated(db)

    expect((await apply(db, "customer_seems_keen")).outcome).toBe("failed")
    expect(
      (await applyStatusEvent({ store: db.store, leadId: 99, event: "qualification_completed", conversationId: null, now: NOW }))
        .outcome,
    ).toBe("failed")
    db.store.updateLeadStatus = async () => {
      throw new Error("database is down")
    }
    expect((await apply(db)).outcome).toBe("failed")

    expect(db.leads[0].status).toBe("New")
    const failures = db.events.filter((e) => e.type === "status_change_failed")
    expect(failures).toHaveLength(3)
    expect(failures.every((e) => e.needs_review && e.severity === "error")).toBe(true)
  })
})
