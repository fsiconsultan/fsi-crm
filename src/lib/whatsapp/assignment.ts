import type { LeadRef } from "./types"

// Assignment rules, in one place so FSI can approve or change them.
//
// The only rule today: a conversation that matches an existing lead goes to the
// salesperson who already owns that lead. Anything else stays unassigned until
// an Admin assigns it in the inbox. FSI has not supplied further rules (round
// robin, by area, by workload), so none are invented here; add them to this
// function when they are approved.
export type AssignmentDecision = { salesId: string; rule: string } | null

export function decideAssignment(lead: LeadRef | null): AssignmentDecision {
  if (lead?.sales_id) return { salesId: lead.sales_id, rule: "lead_owner" }
  return null
}
