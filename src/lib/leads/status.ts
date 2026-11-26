// The seven pipeline statuses stored in leads.status today. Most existing rows
// have no status (null); show those as "No status" and never rewrite them.
// The contract's stage list (New, Qualified, ... Won, Lost) is mapped at kickoff;
// until FSI approves that mapping these values stay as they are.
export const LEAD_STATUSES = [
  "New",
  "First Contact",
  "First Meeting / Appointment / Site Survey",
  "Quotation",
  "Second Appointment",
  "Deal",
  "No Deal",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const NO_STATUS_LABEL = "No status"

export const LEAD_STATUS_SHORT: Record<LeadStatus, string> = {
  "New": "New",
  "First Contact": "First contact",
  "First Meeting / Appointment / Site Survey": "First meeting",
  "Quotation": "Quotation",
  "Second Appointment": "Second appointment",
  "Deal": "Deal",
  "No Deal": "No deal",
}

export const OPEN_STATUSES: LeadStatus[] = LEAD_STATUSES.filter(
  (status) => status !== "Deal" && status !== "No Deal",
)

export function isLeadStatus(value: string | null | undefined): value is LeadStatus {
  return !!value && (LEAD_STATUSES as readonly string[]).includes(value)
}

export const LEAD_TYPES = ["Customer", "Partner"] as const
