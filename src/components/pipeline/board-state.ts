import { LEAD_STATUSES, LEAD_STATUS_SHORT, type LeadStatus } from "@/lib/leads/status"
import type { BoardData, ColumnPage, PipelineLead } from "./types"

export const COLUMN_PAGE = 20

export type ColumnState = {
  cards: PipelineLead[]
  /** From a count query, adjusted by the moves made on this screen. Never the row length. */
  total: number
  loading: boolean
  loadError: string | null
}

type InFlight = { card: PipelineLead; from: LeadStatus; to: LeadStatus; index: number; undo: boolean }

export type Notice =
  | { kind: "moved"; leadId: number; name: string; from: LeadStatus; to: LeadStatus }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string }

export type BoardState = {
  columns: Record<LeadStatus, ColumnState>
  /** Moves the server has not answered yet, by lead id. */
  moving: Record<number, InFlight>
  notice: Notice | null
}

export type Move = { leadId: number; from: LeadStatus; to: LeadStatus; undo?: boolean }

export type BoardAction =
  | ({ type: "move_started" } & Move)
  | { type: "move_succeeded"; leadId: number }
  | { type: "move_failed"; leadId: number; message: string }
  | { type: "notice_dismissed" }
  | { type: "more_started"; status: LeadStatus }
  | { type: "more_loaded"; status: LeadStatus; page: ColumnPage }
  | { type: "more_failed"; status: LeadStatus; message: string }

export function initialBoard(data: BoardData): BoardState {
  const columns = {} as Record<LeadStatus, ColumnState>
  for (const status of LEAD_STATUSES) {
    columns[status] = { ...data.columns[status], loading: false, loadError: null }
  }
  return { columns, moving: {}, notice: null }
}

/** Rows to skip for the next page: the cards that came from the server's order and are still here. */
export function nextOffset(column: ColumnState) {
  return column.cards.filter((card) => !card.moved).length
}

export function hasMore(column: ColumnState) {
  return column.cards.length < column.total
}

function withColumn(state: BoardState, status: LeadStatus, column: Partial<ColumnState>): BoardState {
  return { ...state, columns: { ...state.columns, [status]: { ...state.columns[status], ...column } } }
}

function without(moving: BoardState["moving"], leadId: number) {
  const rest = { ...moving }
  delete rest[leadId]
  return rest
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "move_started": {
      const from = state.columns[action.from]
      const index = from.cards.findIndex((card) => card.id === action.leadId)
      if (index < 0 || action.from === action.to || state.moving[action.leadId]) return state
      const card = from.cards[index]
      const to = state.columns[action.to]
      // A changed status restarts its clock and was set by a person, as the server action writes it.
      const movedCard: PipelineLead = { ...card, daysInStatus: 0, mover: "person", moved: true }
      return {
        columns: {
          ...state.columns,
          [action.from]: { ...from, cards: from.cards.filter((c) => c.id !== card.id), total: from.total - 1 },
          // On top, so the person sees where the card went.
          [action.to]: { ...to, cards: [movedCard, ...to.cards], total: to.total + 1 },
        },
        moving: { ...state.moving, [card.id]: { card, from: action.from, to: action.to, index, undo: !!action.undo } },
        notice: null,
      }
    }

    case "move_succeeded": {
      const move = state.moving[action.leadId]
      if (!move) return state
      const notice: Notice = move.undo
        ? { kind: "info", message: `${move.card.name} is back in ${LEAD_STATUS_SHORT[move.to]}.` }
        : { kind: "moved", leadId: move.card.id, name: move.card.name, from: move.from, to: move.to }
      return { ...state, moving: without(state.moving, action.leadId), notice }
    }

    case "move_failed": {
      const move = state.moving[action.leadId]
      if (!move) return state
      const from = state.columns[move.from]
      const to = state.columns[move.to]
      const cards = [...from.cards]
      cards.splice(Math.min(move.index, cards.length), 0, move.card)
      return {
        columns: {
          ...state.columns,
          [move.from]: { ...from, cards, total: from.total + 1 },
          [move.to]: { ...to, cards: to.cards.filter((c) => c.id !== move.card.id), total: to.total - 1 },
        },
        moving: without(state.moving, action.leadId),
        notice: { kind: "error", message: action.message },
      }
    }

    case "notice_dismissed":
      return { ...state, notice: null }

    case "more_started":
      return withColumn(state, action.status, { loading: true, loadError: null })

    case "more_loaded": {
      // A card moved on this screen can come back in a later page; keep the one already shown.
      const shown = new Set(LEAD_STATUSES.flatMap((status) => state.columns[status].cards.map((card) => card.id)))
      const fresh = action.page.cards.filter((card) => !shown.has(card.id))
      const cards = [...state.columns[action.status].cards, ...fresh]
      return withColumn(state, action.status, {
        cards,
        // The server's count is the truth; never show fewer than the cards on screen.
        total: Math.max(action.page.total, cards.length),
        loading: false,
      })
    }

    case "more_failed":
      return withColumn(state, action.status, { loading: false, loadError: action.message })
  }
}

export type ChangeStatus = (leadId: number, from: string | null, to: string) => Promise<{ ok: boolean; message: string }>

/**
 * Optimistic move: the card moves at once, then the guarded server action runs
 * with the status the card was rendered in. A refusal or a network failure
 * puts the card back and shows why.
 */
export async function performMove(dispatch: (action: BoardAction) => void, change: ChangeStatus, move: Move) {
  dispatch({ type: "move_started", ...move })
  try {
    const result = await change(move.leadId, move.from, move.to)
    if (result.ok) dispatch({ type: "move_succeeded", leadId: move.leadId })
    else dispatch({ type: "move_failed", leadId: move.leadId, message: result.message })
  } catch {
    dispatch({
      type: "move_failed",
      leadId: move.leadId,
      message: "Status not changed: the server could not be reached. Check your connection and try again.",
    })
  }
}
