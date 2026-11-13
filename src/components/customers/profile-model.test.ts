import { describe, expect, it } from "vitest"
import { contactFields, nextStep, setMilestones, stepperState, timeInStage } from "./profile-model"
import { customersHref, parseCustomerFilters } from "./filters"

const states = (status: string | null) => stepperState(status).stages.map((stage) => stage.state)

describe("stepperState", () => {
  it("has six stages from New to Deal, with No deal apart", () => {
    const stepper = stepperState("New")
    expect(stepper.stages.map((stage) => stage.label)).toEqual([
      "New",
      "First contact",
      "First meeting",
      "Quotation",
      "Second appointment",
      "Deal",
    ])
    expect(stepper.noDeal).toBe("off")
  })

  it("marks earlier stages done, the current one current, later ones to do", () => {
    expect(states("Quotation")).toEqual(["done", "done", "done", "current", "todo", "todo"])
    expect(stepperState("Quotation").summary).toBe("Quotation, stage 4 of 6")
  })

  it("puts Deal at the end with everything before it done", () => {
    expect(states("Deal")).toEqual(["done", "done", "done", "done", "done", "current"])
  })

  it("marks no stage at No deal, because the row does not say how far they got", () => {
    const stepper = stepperState("No Deal")
    expect(stepper.stages.every((stage) => stage.state === "todo")).toBe(true)
    expect(stepper.noDeal).toBe("current")
  })

  it("marks no stage when there is no status or an unknown one", () => {
    expect(states(null).every((state) => state === "todo")).toBe(true)
    expect(stepperState(null).summary).toBe("No status yet")
    expect(stepperState("Hot").summary).toContain('"Hot"')
  })
})

describe("timeInStage", () => {
  it("counts days since the status started", () => {
    expect(timeInStage("New", "2026-11-01T03:00:00Z", "2026-11-13")).toBe("12 days in this stage")
    expect(timeInStage("New", "2026-11-12T03:00:00Z", "2026-11-13")).toBe("1 day in this stage")
  })

  it("says the date is unknown instead of guessing", () => {
    expect(timeInStage("New", null, "2026-11-13")).toBe("Status date unknown")
    expect(timeInStage(null, null, "2026-11-13")).toBeNull()
  })
})

describe("contactFields", () => {
  it("keeps only fields with a value, in order, and lists the empty ones", () => {
    const { filled, missing } = contactFields({
      phone: "'081337774426",
      email: "  ",
      business: "Villa Sari",
      location: null,
      lead_type: "Customer",
    })
    expect(filled).toEqual([
      { key: "phone", label: "Phone", value: "+62 813 3777 4426" },
      { key: "business", label: "Business", value: "Villa Sari" },
      { key: "lead_type", label: "Type", value: "Customer" },
    ])
    expect(missing).toEqual(["email", "location"])
  })

  it("reports every field missing for an empty row", () => {
    const empty = { phone: null, email: null, business: null, location: null, lead_type: null }
    expect(contactFields(empty).filled).toEqual([])
    expect(contactFields(empty).missing).toHaveLength(5)
  })
})

describe("nextStep", () => {
  it("is none without a follow-up date", () => {
    expect(nextStep("New", null, "2026-11-13")).toEqual({ kind: "none" })
  })

  it("is overdue for an open customer past the date", () => {
    const step = nextStep("Quotation", "2026-11-10", "2026-11-13")
    expect(step).toMatchObject({ kind: "followup", tone: "overdue" })
  })

  it("is never overdue once the customer is closed", () => {
    expect(nextStep("Deal", "2026-11-10", "2026-11-13")).toMatchObject({ tone: "closed" })
    expect(nextStep("No Deal", "2026-11-10", "2026-11-13")).toMatchObject({ tone: "closed" })
  })

  it("reads today and later dates", () => {
    expect(nextStep(null, "2026-11-13", "2026-11-13")).toMatchObject({ tone: "today" })
    expect(nextStep("New", "2026-11-14", "2026-11-13")).toMatchObject({ tone: "upcoming", detail: "Tomorrow" })
  })
})

describe("setMilestones", () => {
  it("lists only the dates that are set", () => {
    const set = setMilestones({ appointment: null, site_survey: "2026-11-20", quotation: null, closing: "2026-12-01" })
    expect(set.map((m) => m.key)).toEqual(["site_survey", "closing"])
  })
})

describe("customer filters in the URL", () => {
  it("round-trips and drops defaults", () => {
    const filters = parseCustomerFilters({ q: " villa ", docs: "1", sort: "name", page: "3", type: "Partner" })
    expect(filters).toMatchObject({ q: "villa", docs: true, chat: false, sort: "name", page: 3, type: "Partner" })
    expect(customersHref(filters)).toBe("/customers?q=villa&type=Partner&docs=1&sort=name&page=3")
    expect(customersHref(parseCustomerFilters({}))).toBe("/customers")
  })

  it("ignores values it does not know", () => {
    expect(parseCustomerFilters({ sales: "x", type: "Other", sort: "price", page: "-2" })).toMatchObject({
      sales: "",
      type: "",
      sort: "newest",
      page: 1,
    })
  })
})
