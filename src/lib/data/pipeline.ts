import "server-only"
import { COLUMN_PAGE } from "@/components/pipeline/board-state"
import { lastMover, latestAutomated, type AutomatedStatus } from "@/components/pipeline/last-mover"
import type { BoardData, ColumnPage, PipelineLead } from "@/components/pipeline/types"
import { daysInStatus, followUp, leadName } from "@/components/leads/format"
import { today } from "@/lib/leads/dates"
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/status"
import { leadWhere, type MoverFilter, type PipelineFilters } from "@/lib/pipeline/filters"
import { createClient } from "@/lib/supabase/server"
import { countLeads, leadsQuery } from "./leads"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Above the most event rows one read can need, so a full answer means "cut off".
const EVENT_LIMIT = 1000

// The same rows the AI's status guard reads (lastAutomatedStatus in
// src/lib/whatsapp/supabase-store.ts): status changes the server wrote, newest first.
function automatedEvents(supabase: Supabase) {
  return supabase
    .from("automation_events")
    .select("lead_id, detail")
    .is("actor_sales_id", null)
    .in("type", ["status_changed", "lead_created"])
    .order("created_at", { ascending: false })
    .limit(EVENT_LIMIT)
}

/**
 * The automation's newest recorded status per lead, for the "AI" or "Person"
 * marker. If the events cannot be read (the inbox tables are missing, or the
 * query failed), the map is empty and no card shows a marker.
 */
async function automatedStatuses(supabase: Supabase, leadIds: number[]) {
  if (leadIds.length === 0) return new Map<number, AutomatedStatus | null>()
  const { data, error } = await automatedEvents(supabase).in("lead_id", leadIds)
  if (error) {
    console.error(`Reading status history for the pipeline failed: ${error.message}`)
    return new Map<number, AutomatedStatus | null>()
  }
  return latestAutomated(leadIds, data, data.length < EVENT_LIMIT)
}

/** The leads whose current status the automation set, for the "Moved last by" filter. */
export type MoverScope = { mover: MoverFilter; aiIds: number[] } | null

/**
 * Resolves the "Moved last by" filter to lead ids once per request. The marker
 * is not a column, so the leads the automation moved last are worked out here
 * with the cards' own rule, and the columns then include or exclude those ids.
 * Unlike the marker, a filter cannot quietly show nothing: it throws when the
 * history cannot be read in full.
 */
export async function moverScope(mover: MoverFilter | ""): Promise<MoverScope> {
  if (!mover) return null
  const supabase = await createClient()
  const { data, error } = await automatedEvents(supabase)
  if (error) throw new Error(`Reading the status history failed: ${error.message}`)
  if (data.length >= EVENT_LIMIT) throw new Error("The status history is too long to filter by who moved a lead last.")

  const latest = latestAutomated([], data, true)
  const candidates = [...latest.keys()]
  if (candidates.length === 0) return { mover, aiIds: [] }

  const leads = await supabase.from("leads").select("id, status, status_started_at").in("id", candidates)
  if (leads.error) throw new Error(`Reading the leads the automation moved failed: ${leads.error.message}`)
  return {
    mover,
    aiIds: leads.data.filter((lead) => lastMover(lead, latest.get(lead.id)) === "ai").map((lead) => lead.id),
  }
}

/**
 * One page of a column, longest in the status first (leads with no status date
 * last), under the board's filters. Built by the same query builder as the
 * leads list and the Overview counts, so "stuck" and "follow-up due" mean the
 * same thing everywhere. Runs as the signed-in user: RLS scopes the rows. The
 * total comes from the count, not from the rows.
 */
export async function loadColumn(options: {
  status: LeadStatus
  filters: PipelineFilters
  scope: MoverScope
  offset: number
  /** Salesperson names by id, for Admin; null hides the owner line. */
  owners: Map<string, string> | null
}): Promise<ColumnPage> {
  const { status, filters, scope, offset, owners } = options
  if (scope?.mover === "ai" && scope.aiIds.length === 0) return { cards: [], total: 0 }

  const supabase = await createClient()
  const where = leadWhere(filters, status, today())
  const filtered = () => {
    const query = leadsQuery(supabase, where, false)
    if (!scope) return query
    if (scope.mover === "ai") return query.in("id", scope.aiIds)
    return scope.aiIds.length > 0 ? query.not("id", "in", `(${scope.aiIds.join(",")})`) : query
  }

  const { data, count, error } = await filtered()
    .order("status_started_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, offset + COLUMN_PAGE - 1)

  // PGRST103: the offset is past the last row (cards were moved away meanwhile). An empty page.
  if (error && error.code !== "PGRST103") throw new Error(`Loading the ${status} column failed: ${error.message}`)

  let total = count ?? 0
  if (error) {
    const recount = await filtered().limit(1)
    if (recount.error) throw new Error(`Counting the ${status} column failed: ${recount.error.message}`)
    total = recount.count ?? 0
  }

  const rows = data ?? []
  const automated = await automatedStatuses(
    supabase,
    rows.map((row) => row.id),
  )

  const cards: PipelineLead[] = rows.map((row) => ({
    id: row.id,
    name: leadName(row.customer_name),
    business: row.business,
    location: row.location,
    owner: owners?.get(row.sales_id ?? "") ?? null,
    daysInStatus: daysInStatus(row.status_started_at),
    followUp: followUp(row.follow_up_date),
    mover: lastMover(row, automated.get(row.id)),
  }))

  return { cards, total }
}

export async function loadBoard(options: {
  filters: PipelineFilters
  owners: Map<string, string> | null
}): Promise<BoardData> {
  const { filters, owners } = options
  const scope = await moverScope(filters.mover)
  const [pages, noStatus] = await Promise.all([
    Promise.all(LEAD_STATUSES.map((status) => loadColumn({ status, filters, scope, offset: 0, owners }))),
    // A lead with no status has no mover, so that filter leaves none of them.
    scope ? 0 : countLeads(leadWhere(filters, "none", today())),
  ])
  const columns = {} as BoardData["columns"]
  LEAD_STATUSES.forEach((status, index) => {
    columns[status] = pages[index]
  })
  return { columns, noStatus }
}
