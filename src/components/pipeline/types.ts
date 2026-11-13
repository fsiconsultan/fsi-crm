import type { LeadStatus } from "@/lib/leads/status"

export type Mover = "ai" | "person"

/** One card on the board: only what the card shows, safe to send to the browser. */
export type PipelineLead = {
  id: number
  name: string
  business: string | null
  location: string | null
  /** Salesperson name; null for everyone but Admin, and for unassigned leads. */
  owner: string | null
  /** Null when the lead has a status but no date for it. */
  daysInStatus: number | null
  followUp: { label: string; overdue: boolean } | null
  /** Who set the current status; null when it cannot be determined. */
  mover: Mover | null
  /** Moved on this screen since it loaded, so it is not where the server's order puts it. */
  moved?: boolean
}

export type ColumnPage = { cards: PipelineLead[]; total: number }

export type BoardData = {
  columns: Record<LeadStatus, ColumnPage>
  /** Leads with no status: not on the board, counted for the link to the list. */
  noStatus: number
}

export type PageResult = { ok: true; page: ColumnPage } | { ok: false; message: string }
