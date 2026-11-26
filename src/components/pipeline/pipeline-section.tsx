import Link from "next/link"
import { n } from "@/components/dashboard/format"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { loadBoard } from "@/lib/data/pipeline"
import { today } from "@/lib/leads/dates"
import { LEAD_STATUSES } from "@/lib/leads/status"
import { noStatusHref, type PipelineFilters } from "@/lib/pipeline/filters"
import { PipelineBoard } from "./pipeline-board"
import type { BoardData } from "./types"

// Leads with no status are not on the board; this says how many match and opens them.
function NoStatusLink({ count, href }: { count: number; href: string | null }) {
  if (count === 0 || !href) return null
  return (
    <p className="text-[13px] text-muted">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink md:min-h-8"
      >
        {n(count)} {count === 1 ? "lead has" : "leads have"} no status and {count === 1 ? "is" : "are"} not on the board
      </Link>
    </p>
  )
}

/**
 * Loads the board as the signed-in user (RLS scopes it) under the page's
 * filters and renders it. `retryHref` reloads the page as it is.
 */
export async function PipelineSection({
  filters,
  owners,
  retryHref,
}: {
  filters: PipelineFilters
  /** Salesperson names by id for Admin; null for everyone else. */
  owners: Map<string, string> | null
  retryHref: string
}) {
  let board: BoardData
  try {
    board = await loadBoard({ filters, owners })
  } catch (error) {
    console.error(error)
    return (
      <Card className="max-md:p-4">
        <ErrorState
          title="The pipeline could not be loaded"
          detail="The database did not answer for one of the columns or for the status history, so no board is shown rather than a partial one. Check your connection and try again."
          action={
            // A full reload on purpose: it re-runs every query.
            <a href={retryHref} className={buttonClass("secondary")}>
              Try again
            </a>
          }
        />
      </Card>
    )
  }

  const onBoard = LEAD_STATUSES.reduce((sum, status) => sum + board.columns[status].total, 0)
  const filtered = retryHref !== "/pipeline"
  const noStatus = <NoStatusLink count={board.noStatus} href={noStatusHref(filters, today())} />

  if (onBoard === 0 && filtered) {
    return (
      <Card className="max-md:p-4">
        <EmptyState
          title="No lead on the board matches these filters"
          detail="Remove a filter above, or clear them all to see the whole board."
          action={
            <Link href="/pipeline" className={buttonClass("secondary")}>
              Clear all filters
            </Link>
          }
        />
        {noStatus}
      </Card>
    )
  }

  if (onBoard === 0 && board.noStatus === 0) {
    return (
      <Card className="max-md:p-4">
        <EmptyState
          title="No leads to show yet"
          detail="A lead appears on the board once it has a status. Add a lead, or ask an Admin to assign one to you."
          action={
            <Link href="/leads/new" className={buttonClass("primary")}>
              Add a lead
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <>
      <p className="mb-3 text-[13px] text-muted">
        {n(onBoard)} {onBoard === 1 ? "lead" : "leads"} {filtered ? "match the filters" : "with a status"}. Drag a card to
        another column, or use Move to.
      </p>
      {/* Remount when the filters change, so the board never keeps another view's cards. */}
      <PipelineBoard key={retryHref} initial={board} filters={filters} />
      <div className="mt-2">{noStatus}</div>
    </>
  )
}
