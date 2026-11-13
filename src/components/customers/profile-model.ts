import { LEAD_STATUSES, LEAD_STATUS_SHORT, type LeadStatus } from "@/lib/leads/status"
import { dayCount, daysBetween, formatDayLong, readablePhone } from "./format"

// Pure rules behind the customer profile, kept apart from the markup so they can be tested.

/** The stages a customer walks through, New to Deal. No deal sits apart from them. */
export const STAGES = LEAD_STATUSES.filter((status) => status !== "No Deal")

export type StageState = "done" | "current" | "todo"

export type Stepper = {
  stages: Array<{ status: LeadStatus; label: string; state: StageState }>
  /** "current" when the customer is at No deal. */
  noDeal: "current" | "off"
  /** One line naming where the customer is. */
  summary: string
}

/**
 * Earlier stages are done, the stage the customer is at is current, later
 * ones are still to come. At No deal, or with no status (or one outside the
 * list), no stage is marked: the row does not say how far the customer got.
 */
export function stepperState(status: string | null): Stepper {
  const index = STAGES.findIndex((stage) => stage === status)
  const stages = STAGES.map((stage, i) => ({
    status: stage,
    label: LEAD_STATUS_SHORT[stage],
    state: stageState(i, index),
  }))

  if (status === "No Deal") return { stages, noDeal: "current", summary: "No deal: this customer did not buy" }
  if (index >= 0) {
    return { stages, noDeal: "off", summary: `${LEAD_STATUS_SHORT[STAGES[index]]}, stage ${index + 1} of ${STAGES.length}` }
  }
  if (status) return { stages, noDeal: "off", summary: `"${status}" is not one of the pipeline stages` }
  return { stages, noDeal: "off", summary: "No status yet" }
}

function stageState(i: number, current: number): StageState {
  if (current < 0) return "todo"
  if (i < current) return "done"
  return i === current ? "current" : "todo"
}

/** "12 days in this stage", or the honest answer when the start date is missing. */
export function timeInStage(status: string | null, statusStartedAt: string | null, today: string) {
  if (!status) return null
  if (!statusStartedAt) return "Status date unknown"
  const start = statusStartedAt.slice(0, 10)
  const days = Math.max(0, daysBetween(start, today))
  return `${dayCount(days)} in this stage`
}

const CONTACT_KEYS = ["phone", "email", "business", "location", "lead_type"] as const

export type ContactKey = (typeof CONTACT_KEYS)[number]

const CONTACT_LABELS: Record<ContactKey, string> = {
  phone: "Phone",
  email: "Email",
  business: "Business",
  location: "Location",
  lead_type: "Type",
}

export type ContactField = { key: ContactKey; label: string; value: string }

/** Contact details split into the ones that hold a value and the ones still empty, in a fixed order. */
export function contactFields(customer: Record<ContactKey, string | null>) {
  const filled: ContactField[] = []
  const missing: ContactKey[] = []
  for (const key of CONTACT_KEYS) {
    const raw = customer[key]?.trim() ?? ""
    const value = key === "phone" ? (readablePhone(raw)?.text ?? "") : raw
    if (value) filled.push({ key, label: CONTACT_LABELS[key], value })
    else missing.push(key)
  }
  return { filled, missing }
}

export type NextStep =
  | { kind: "none" }
  | { kind: "followup"; tone: "overdue" | "today" | "upcoming" | "closed"; title: string; detail: string }

/**
 * The follow-up date read against today. It counts as overdue only while the
 * customer is open: a follow-up on Deal or No deal is history, the same rule as
 * the Overview's "follow-ups due".
 */
export function nextStep(status: string | null, followUpDate: string | null, today: string): NextStep {
  if (!followUpDate) return { kind: "none" }
  const day = followUpDate.slice(0, 10)
  const date = formatDayLong(day)
  const diff = daysBetween(today, day)
  if (status === "Deal" || status === "No Deal") {
    return { kind: "followup", tone: "closed", title: `Follow-up date ${date}`, detail: "This customer is closed, so it is not due." }
  }
  if (diff < 0) {
    return { kind: "followup", tone: "overdue", title: `Follow-up was due ${date}`, detail: `${dayCount(-diff)} overdue. Call or message them, then set the next date.` }
  }
  if (diff === 0) return { kind: "followup", tone: "today", title: "Follow up today", detail: date }
  return {
    kind: "followup",
    tone: "upcoming",
    title: `Follow up on ${date}`,
    detail: diff === 1 ? "Tomorrow" : `In ${dayCount(diff)}`,
  }
}

export const MILESTONES = [
  { key: "appointment", label: "Appointment" },
  { key: "site_survey", label: "Site survey" },
  { key: "quotation", label: "Quotation" },
  { key: "closing", label: "Closing" },
] as const

export type MilestoneKey = (typeof MILESTONES)[number]["key"]

/** Only the pipeline dates that are set, in the order the work happens. */
export function setMilestones(customer: Record<MilestoneKey, string | null>) {
  return MILESTONES.filter((m) => customer[m.key]).map((m) => ({
    key: m.key,
    label: m.label,
    date: formatDayLong(customer[m.key] ?? ""),
  }))
}
