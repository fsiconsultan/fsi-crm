import { describe, expect, it } from "vitest"
import {
  COLUMN_PAGE,
  boardReducer,
  hasMore,
  initialBoard,
  nextOffset,
  performMove,
  type BoardAction,
  type BoardState,
  type ChangeStatus,
} from "./board-state"
import { LEAD_STATUSES } from "@/lib/leads/status"
import type { BoardData, PipelineLead } from "./types"

function card(id: number, extra: Partial<PipelineLead> = {}): PipelineLead {
  return {
    id,
    name: `Lead ${id}`,
    business: null,
    location: null,
    owner: null,
    daysInStatus: 30,
    followUp: null,
    mover: "ai",
    ...extra,
  }
}

function board(columns: Partial<Record<(typeof LEAD_STATUSES)[number], { cards: PipelineLead[]; total: number }>>) {
  const data: BoardData = { columns: {} as BoardData["columns"], noStatus: 0 }
  for (const status of LEAD_STATUSES) data.columns[status] = columns[status] ?? { cards: [], total: 0 }
  return initialBoard(data)
}

// A tiny store: runs the reducer the way useReducer does and records every call to the action.
function harness(start: BoardState, change: ChangeStatus) {
  let state = start
  const calls: Array<[number, string | null, string]> = []
  const dispatch = (action: BoardAction) => {
    state = boardReducer(state, action)
  }
  const fake: ChangeStatus = (leadId, from, to) => {
    calls.push([leadId, from, to])
    return change(leadId, from, to)
  }
  return { dispatch, fake, calls, get state() { return state } }
}

const ids = (state: BoardState, status: (typeof LEAD_STATUSES)[number]) => state.columns[status].cards.map((c) => c.id)

describe("optimistic move", () => {
  const start = () =>
    board({
      "New": { cards: [card(1), card(2), card(3)], total: 40 },
      "First Contact": { cards: [card(10)], total: 190 },
    })

  it("moves the card at once, before the server answers", () => {
    const state = boardReducer(start(), { type: "move_started", leadId: 2, from: "New", to: "First Contact" })
    expect(ids(state, "New")).toEqual([1, 3])
    expect(ids(state, "First Contact")).toEqual([2, 10])
    expect(state.columns["New"].total).toBe(39)
    expect(state.columns["First Contact"].total).toBe(191)
    expect(state.columns["First Contact"].cards[0]).toMatchObject({ daysInStatus: 0, mover: "person", moved: true })
    expect(state.moving[2]).toBeDefined()
  })

  it("success: calls the action with the rendered status, keeps the card and offers Undo", async () => {
    const h = harness(start(), async () => ({ ok: true, message: "ok" }))
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "New", to: "First Contact" })

    expect(h.calls).toEqual([[2, "New", "First Contact"]])
    expect(ids(h.state, "First Contact")).toEqual([2, 10])
    expect(h.state.moving).toEqual({})
    expect(h.state.notice).toEqual({ kind: "moved", leadId: 2, name: "Lead 2", from: "New", to: "First Contact" })
  })

  it("failure: puts the card back where it was, restores the counts and shows the server's message", async () => {
    const h = harness(start(), async () => ({ ok: false, message: "Status not changed. Someone else changed this lead." }))
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "New", to: "First Contact" })

    expect(ids(h.state, "New")).toEqual([1, 2, 3])
    expect(ids(h.state, "First Contact")).toEqual([10])
    expect(h.state.columns["New"].total).toBe(40)
    expect(h.state.columns["First Contact"].total).toBe(190)
    expect(h.state.columns["New"].cards[1]).toEqual(card(2))
    expect(h.state.notice).toEqual({ kind: "error", message: "Status not changed. Someone else changed this lead." })
  })

  it("failure: a network error rolls back too and says nothing was changed", async () => {
    const h = harness(start(), async () => {
      throw new Error("offline")
    })
    await performMove(h.dispatch, h.fake, { leadId: 1, from: "New", to: "Quotation" })

    expect(ids(h.state, "New")).toEqual([1, 2, 3])
    expect(ids(h.state, "Quotation")).toEqual([])
    expect(h.state.notice).toMatchObject({ kind: "error" })
  })

  it("undo: moves it back through the same guarded action, from the status it now shows", async () => {
    const h = harness(start(), async () => ({ ok: true, message: "ok" }))
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "New", to: "First Contact" })
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "First Contact", to: "New", undo: true })

    expect(h.calls[1]).toEqual([2, "First Contact", "New"])
    expect(ids(h.state, "New")).toEqual([2, 1, 3])
    expect(ids(h.state, "First Contact")).toEqual([10])
    expect(h.state.columns["New"].total).toBe(40)
    expect(h.state.columns["First Contact"].total).toBe(190)
    // No second Undo: the notice only confirms.
    expect(h.state.notice).toEqual({ kind: "info", message: "Lead 2 is back in New." })
  })

  it("undo refused by the server leaves the card in the new status and says so", async () => {
    let call = 0
    const h = harness(start(), async () => (++call === 1 ? { ok: true, message: "ok" } : { ok: false, message: "Refused." }))
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "New", to: "First Contact" })
    await performMove(h.dispatch, h.fake, { leadId: 2, from: "First Contact", to: "New", undo: true })

    expect(ids(h.state, "First Contact")).toEqual([2, 10])
    expect(ids(h.state, "New")).toEqual([1, 3])
    expect(h.state.notice).toEqual({ kind: "error", message: "Refused." })
  })

  it("ignores a second move of a card whose first move is still on its way", () => {
    const moving = boardReducer(start(), { type: "move_started", leadId: 2, from: "New", to: "First Contact" })
    expect(boardReducer(moving, { type: "move_started", leadId: 2, from: "First Contact", to: "Deal" })).toBe(moving)
  })
})

describe("column paging", () => {
  const page = (from: number, count: number) => Array.from({ length: count }, (_, index) => card(from + index))

  it("counts come from the count query, not from the rows loaded", () => {
    const state = board({ "First Contact": { cards: page(1, COLUMN_PAGE), total: 190 } })
    const column = state.columns["First Contact"]
    expect(column.total).toBe(190)
    expect(hasMore(column)).toBe(true)
    expect(nextOffset(column)).toBe(COLUMN_PAGE)
  })

  it("appends the next page and stops offering more at the end", () => {
    let state = board({ "Quotation": { cards: page(1, 20), total: 25 } })
    state = boardReducer(state, { type: "more_started", status: "Quotation" })
    expect(state.columns["Quotation"].loading).toBe(true)
    state = boardReducer(state, { type: "more_loaded", status: "Quotation", page: { cards: page(21, 5), total: 25 } })
    expect(state.columns["Quotation"].cards).toHaveLength(25)
    expect(state.columns["Quotation"].loading).toBe(false)
    expect(hasMore(state.columns["Quotation"])).toBe(false)
  })

  it("a card moved in on this screen does not shift the offset or show twice", () => {
    let state = board({
      "New": { cards: [card(99)], total: 1 },
      "Quotation": { cards: page(1, 20), total: 30 },
    })
    state = boardReducer(state, { type: "move_started", leadId: 99, from: "New", to: "Quotation" })
    state = boardReducer(state, { type: "move_succeeded", leadId: 99 })
    expect(nextOffset(state.columns["Quotation"])).toBe(20)

    // The server now has 31 rows; its next page ends with the moved card.
    const next = [...page(21, 10), card(99)]
    state = boardReducer(state, { type: "more_loaded", status: "Quotation", page: { cards: next, total: 31 } })
    expect(state.columns["Quotation"].cards.filter((c) => c.id === 99)).toHaveLength(1)
    expect(state.columns["Quotation"].cards).toHaveLength(31)
    expect(hasMore(state.columns["Quotation"])).toBe(false)
  })

  it("a card moved out lowers the offset, so the next page skips nothing", () => {
    let state = board({ "Quotation": { cards: page(1, 20), total: 30 } })
    state = boardReducer(state, { type: "move_started", leadId: 5, from: "Quotation", to: "Deal" })
    expect(nextOffset(state.columns["Quotation"])).toBe(19)
    expect(state.columns["Quotation"].total).toBe(29)
  })

  it("a failed load keeps the cards and reports the failure", () => {
    let state = board({ "Quotation": { cards: page(1, 20), total: 30 } })
    state = boardReducer(state, { type: "more_started", status: "Quotation" })
    state = boardReducer(state, { type: "more_failed", status: "Quotation", message: "More leads could not be loaded." })
    expect(state.columns["Quotation"]).toMatchObject({ loading: false, loadError: "More leads could not be loaded." })
    expect(state.columns["Quotation"].cards).toHaveLength(20)
  })
})
