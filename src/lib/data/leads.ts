import "server-only"
import { addDays, dayStart, today } from "@/lib/leads/dates"
import { PAGE_SIZE, STALE_DAYS, type LeadFilters, type LeadSort } from "@/lib/leads/filters"
import { OPEN_STATUSES } from "@/lib/leads/status"
import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export type Lead = Tables<"leads">

export type SalesUser = { id: string; name: string; role: string | null; status: string | null }

/** Everything that narrows which leads match; sorting and paging are separate. */
export type LeadWhere = Partial<Omit<LeadFilters, "sort" | "page">>

type Supabase = Awaited<ReturnType<typeof createClient>>

const SORT_COLUMNS: Record<LeadSort, { column: keyof Lead; ascending: boolean }> = {
  name: { column: "customer_name", ascending: true },
  name_desc: { column: "customer_name", ascending: false },
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  longest: { column: "status_started_at", ascending: true },
  followup: { column: "follow_up_date", ascending: true },
}

// The search term goes inside a quoted PostgREST value, so drop the characters
// that would end the quote or act as LIKE wildcards.
function searchTerm(q: string) {
  return q.replace(/["\\%_*]/g, " ").replace(/\s+/g, " ").trim()
}

// One place turns filters into a query, so a dashboard count and the list it
// links to can never disagree. Runs as the signed-in user: RLS scopes the rows.
function leadsQuery(supabase: Supabase, where: LeadWhere, head: boolean) {
  let query = supabase.from("leads").select("*", { count: "exact", head })

  const term = where.q ? searchTerm(where.q) : ""
  if (term) {
    const like = `"%${term}%"`
    query = query.or(`customer_name.ilike.${like},phone.ilike.${like},business.ilike.${like}`)
  }

  if (where.status === "none") query = query.is("status", null)
  else if (where.status) query = query.eq("status", where.status)

  if (where.sales) query = query.eq("sales_id", where.sales)
  if (where.type) query = query.eq("lead_type", where.type)

  if (where.from) query = query.gte("created_at", dayStart(where.from))
  if (where.to) query = query.lt("created_at", dayStart(addDays(where.to, 1)))
  if (where.sfrom) query = query.gte("status_started_at", dayStart(where.sfrom))
  if (where.sto) query = query.lt("status_started_at", dayStart(addDays(where.sto, 1)))

  if (where.view === "followup") {
    query = query
      .lte("follow_up_date", today())
      .or('status.is.null,status.not.in.("Deal","No Deal")')
  } else if (where.view === "stale") {
    query = query
      .in("status", OPEN_STATUSES)
      .lt("status_started_at", dayStart(addDays(today(), -STALE_DAYS)))
  } else if (where.view === "open") {
    query = query.in("status", OPEN_STATUSES)
  } else if (where.view === "undated") {
    query = query.not("status", "is", null).is("status_started_at", null)
  }

  return query
}

export async function countLeads(where: LeadWhere = {}) {
  const supabase = await createClient()
  const { count, error } = await leadsQuery(supabase, where, true)
  if (error) throw new Error(`Counting leads failed: ${error.message}`)
  return count ?? 0
}

export async function listLeads(filters: LeadFilters) {
  const supabase = await createClient()
  const { column, ascending } = SORT_COLUMNS[filters.sort]
  const start = (filters.page - 1) * PAGE_SIZE

  const { data, count, error } = await leadsQuery(supabase, filters, false)
    .order(column, { ascending, nullsFirst: false })
    .order("id", { ascending: true })
    .range(start, start + PAGE_SIZE - 1)

  // PostgREST answers 416 when the page starts past the last row; that is an
  // empty page, not a failure.
  if (error && error.code !== "PGRST103") throw new Error(`Loading leads failed: ${error.message}`)

  return { rows: data ?? [], total: error ? await countLeads(filters) : (count ?? 0) }
}

export async function recentLeads(where: LeadWhere, limit: number) {
  const supabase = await createClient()
  const { data, error } = await leadsQuery(supabase, where, false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Loading recent leads failed: ${error.message}`)
  return data ?? []
}

export async function getLead(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(`Loading the lead failed: ${error.message}`)
  return data
}

/** Admin gets the whole team; everyone else gets only their own row (RLS). */
export async function listSalesUsers(): Promise<SalesUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sales_users")
    .select("id, name, username, role, status")
    .order("name", { ascending: true })
  if (error) throw new Error(`Loading the sales team failed: ${error.message}`)
  return (data ?? []).map((user) => ({
    id: user.id,
    name: user.name ?? user.username ?? "Unnamed user",
    role: user.role,
    status: user.status,
  }))
}

export type LeadHit = {
  id: number
  customer_name: string | null
  phone: string | null
  business: string | null
  status: string | null
}

/** The command palette: leads whose name, phone or business contains the term (RLS-scoped). */
export async function searchLeads(q: string, limit: number): Promise<LeadHit[]> {
  if (!searchTerm(q)) return []
  const supabase = await createClient()
  const { data, error } = await leadsQuery(supabase, { q }, false)
    .order("customer_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit)
  if (error) throw new Error(`Searching leads failed: ${error.message}`)
  return (data ?? []).map(({ id, customer_name, phone, business, status }) => ({
    id,
    customer_name,
    phone,
    business,
    status,
  }))
}

// PostgREST returns at most 1,000 rows per request, so an export reads in pages.
const EXPORT_PAGE = 1000

/** Every lead matching the filters, newest first, for a CSV export (RLS-scoped). */
export async function exportLeads(where: LeadWhere): Promise<Lead[]> {
  const supabase = await createClient()
  const rows: Lead[] = []
  for (let start = 0; ; start += EXPORT_PAGE) {
    const { data, error } = await leadsQuery(supabase, where, false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + EXPORT_PAGE - 1)
    if (error) throw new Error(`Exporting leads failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < EXPORT_PAGE) return rows
  }
}
