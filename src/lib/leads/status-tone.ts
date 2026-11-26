import type { CSSProperties } from "react"
import type { LeadStatus } from "./status"

// One soft color per pipeline status (tokens --st-* in globals.css). Used with the
// .tone-card, .tone-lane and .tone-dot classes; the status name is always shown as
// text too, so color is never the only signal.
const TONE_VAR: Record<LeadStatus, string> = {
  "New": "--st-new",
  "First Contact": "--st-first-contact",
  "First Meeting / Appointment / Site Survey": "--st-first-meeting",
  "Quotation": "--st-quotation",
  "Second Appointment": "--st-second-appointment",
  "Deal": "--st-deal",
  "No Deal": "--st-no-deal",
}

export function toneStyle(status: LeadStatus): CSSProperties {
  return { "--tone": `var(${TONE_VAR[status]})` } as CSSProperties
}
