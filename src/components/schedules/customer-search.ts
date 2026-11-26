import { leadName } from "@/components/leads/format"
import type { BookingLead } from "./booking-model"

// The booking dialog's customer step on the browser side: what a search shows
// while it runs, what it says, how the arrow keys move, and what a picked
// customer turns into. The server decides which customers can be found (RLS).

/** One customer the search found. */
export type CustomerHit = {
  id: number
  name: string | null
  phone: string | null
  business: string | null
  location: string | null
  status: string | null
  email: string | null
  salesId: string | null
}

export type CustomerSearchResult = { ok: true; hits: CustomerHit[]; more: boolean } | { ok: false }

export type SearchState =
  | { kind: "idle" }
  | { kind: "loading"; hits: CustomerHit[] }
  | { kind: "done"; hits: CustomerHit[]; term: string; more: boolean }
  | { kind: "error" }

export const SEARCH_IDLE: SearchState = { kind: "idle" }

export function hitsOf(state: SearchState): CustomerHit[] {
  return state.kind === "done" || state.kind === "loading" ? state.hits : []
}

/** Typing: a blank box goes back to idle; anything else searches, keeping the last hits on screen meanwhile. */
export function startSearch(state: SearchState, query: string): SearchState {
  if (!query.trim()) return SEARCH_IDLE
  return { kind: "loading", hits: hitsOf(state) }
}

export function finishSearch(result: CustomerSearchResult, query: string): SearchState {
  if (!result.ok) return { kind: "error" }
  return { kind: "done", hits: result.hits, term: query.trim(), more: result.more }
}

/** The live line under the box. */
export function searchMessage(state: SearchState): string {
  if (state.kind === "idle") return "Type a name, phone number or business. Arrow keys move, Enter picks."
  if (state.kind === "loading") return "Searching…"
  if (state.kind === "error") return "The search failed. Check your connection and try again."
  if (state.hits.length === 0) return `No customer matches "${state.term}". Check the spelling or try the phone number.`
  if (state.more) return `First ${state.hits.length} by name. Type more to narrow it down.`
  return state.hits.length === 1 ? "1 customer found." : `${state.hits.length} customers found.`
}

/** ArrowDown and ArrowUp wrap around the list. Home and End stay with the text box. Null: not a list key. */
export function moveActive(active: number, key: string, count: number): number | null {
  if (count === 0) return null
  if (key === "ArrowDown") return (active + 1) % count
  if (key === "ArrowUp") return (active - 1 + count) % count
  return null
}

/** Business and location, the line under the name. */
export function placeLine(hit: Pick<CustomerHit, "business" | "location">) {
  return [hit.business?.trim(), hit.location?.trim()].filter(Boolean).join(" · ")
}

/** The picked customer as the booking form needs it. */
export function bookingLeadOf(hit: CustomerHit): BookingLead {
  return { id: hit.id, name: leadName(hit.name), location: hit.location, email: hit.email, salesId: hit.salesId }
}
