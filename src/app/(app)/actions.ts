"use server"

import { getProfile, isAdmin } from "@/lib/auth"
import { resolvePeriod } from "@/lib/data/dashboard"
import { exportLeads, listSalesUsers, searchLeads, type LeadHit } from "@/lib/data/leads"
import { toCsv } from "@/lib/leads/csv"
import { dayOf } from "@/lib/leads/dates"
import { isUuid } from "@/lib/leads/filters"

const SEARCH_LIMIT = 8

export type SearchResult = { ok: true; hits: LeadHit[]; more: boolean } | { ok: false }

// The command palette. Reads as the signed-in user, so RLS decides which leads
// can be found; the term is cleaned and quoted inside the query builder.
export async function searchLeadsAction(q: string): Promise<SearchResult> {
  await getProfile()
  try {
    // One extra row says whether there are more matches than shown.
    const hits = await searchLeads(String(q).slice(0, 80), SEARCH_LIMIT + 1)
    return { ok: true, hits: hits.slice(0, SEARCH_LIMIT), more: hits.length > SEARCH_LIMIT }
  } catch (error) {
    console.error(error)
    return { ok: false }
  }
}

export type ExportResult =
  | { ok: true; csv: string; filename: string; count: number }
  | { ok: false; error: string }

const HEADER = ["Name", "Phone", "Business", "Location", "Status", "Salesperson", "Created", "Follow-up"]

// The Export pill: the leads added in the Overview's date range, for the
// salesperson picked in the scope menu (Admin only). RLS scopes the rows, so
// everyone else only ever exports their own leads.
export async function exportOverviewCsv(input: { period: string; sales: string }): Promise<ExportResult> {
  const profile = await getProfile()
  const period = resolvePeriod(String(input.period))
  const sales = isAdmin(profile) && isUuid(String(input.sales)) ? String(input.sales) : ""

  try {
    const [leads, team] = await Promise.all([
      exportLeads({ sales, from: period.from, to: period.to }),
      listSalesUsers(),
    ])
    const names = new Map(team.map((user) => [user.id, user.name]))
    const csv = toCsv(
      HEADER,
      leads.map((lead) => [
        lead.customer_name,
        lead.phone,
        lead.business,
        lead.location,
        lead.status,
        lead.sales_id ? (names.get(lead.sales_id) ?? "") : "",
        dayOf(lead.created_at),
        lead.follow_up_date,
      ]),
    )
    const who = sales ? `-${(names.get(sales) ?? "salesperson").toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""
    return { ok: true, csv, count: leads.length, filename: `fsi-leads-added-${period.from}-to-${period.to}${who}.csv` }
  } catch (error) {
    console.error(error)
    return { ok: false, error: "The export failed. Check your connection and try again." }
  }
}
