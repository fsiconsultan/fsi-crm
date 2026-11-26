import type { LeadStatus } from "@/lib/leads/status"

/**
 * "New" lists the newest leads first: a lead that just arrived (from the website,
 * say) needs a first call before anything else. Every other column lists the
 * longest in the status first, so stuck leads stay in view. Leads with no
 * status date come last either way.
 */
export function columnOrder(status: LeadStatus): "newest_first" | "oldest_first" {
  return status === "New" ? "newest_first" : "oldest_first"
}
