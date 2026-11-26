"use server"

import type { PageResult } from "@/components/pipeline/types"
import { getProfile, isAdmin } from "@/lib/auth"
import { listSalesUsers } from "@/lib/data/leads"
import { loadColumn, moverScope } from "@/lib/data/pipeline"
import { isLeadStatus } from "@/lib/leads/status"
import { parsePipelineFilters, type PipelineFilters } from "@/lib/pipeline/filters"

// "Show more" on a board column: a read, under the same filters as the board.
// The filters arrive from the browser, so they are parsed again here. RLS scopes
// the rows to the signed-in user; only Admin can narrow to another salesperson
// or see owner names.
export async function loadMoreColumn(status: string, filters: PipelineFilters, offset: number): Promise<PageResult> {
  const profile = await getProfile()
  if (!isLeadStatus(status) || !Number.isSafeInteger(offset) || offset < 0) {
    return { ok: false, message: "More leads could not be loaded. Reload the page and try again." }
  }
  const admin = isAdmin(profile)
  const parsed = parsePipelineFilters({
    q: String(filters?.q ?? ""),
    sales: admin ? String(filters?.sales ?? "") : "",
    type: String(filters?.type ?? ""),
    mover: String(filters?.mover ?? ""),
    added: String(filters?.added ?? ""),
    stuck: filters?.stuck ? "1" : "",
    due: filters?.due ? "1" : "",
  })
  try {
    const [team, scope] = await Promise.all([admin ? listSalesUsers() : null, moverScope(parsed.mover)])
    const page = await loadColumn({
      status,
      filters: parsed,
      scope,
      offset,
      owners: team ? new Map(team.map((user) => [user.id, user.name])) : null,
    })
    return { ok: true, page }
  } catch (error) {
    console.error(error)
    return { ok: false, message: "More leads could not be loaded. Check your connection and try again." }
  }
}
