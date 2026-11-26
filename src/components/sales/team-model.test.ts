import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const { attentionOf } = await import("@/lib/whatsapp/inbox")
const {
  filterTeam,
  groupWaitingChats,
  loadScale,
  loadWidth,
  parseTeamParams,
  personLinks,
  sortTeam,
  teamHref,
} = await import("./team-model")

type Row = Parameters<typeof sortTeam>[0][number]

function row(name: string, patch: Partial<Row["counts"]> = {}, person: Partial<Row["person"]> = {}): Row {
  return {
    person: { id: name, name, username: name.toLowerCase(), role: "Sales", status: "Active", photoUrl: null, ...person },
    counts: { total: 0, open: 0, deals: 0, added: 0, followUpsDue: 0, stale: 0, ...patch },
    waitingChats: null,
  }
}

describe("workload scaling", () => {
  it("draws every bar against the team's largest number of assigned leads", () => {
    const rows = [row("Ristyawan", { total: 2000, open: 18 }), row("Ayu", { total: 100, open: 100 }), row("Budi")]
    const scale = loadScale(rows)
    expect(scale).toBe(2000)
    expect(loadWidth(2000, scale)).toBe(100)
    expect(loadWidth(1000, scale)).toBe(50)
  })

  it("keeps a visible sliver for a small load next to an outlier, and nothing for zero", () => {
    expect(loadWidth(5, 2147)).toBe(2)
    expect(loadWidth(0, 2147)).toBe(0)
  })

  it("never divides by zero when nobody has leads", () => {
    expect(loadScale([row("A"), row("B")])).toBe(1)
    expect(loadScale([])).toBe(1)
    expect(loadWidth(0, loadScale([]))).toBe(0)
  })
})

describe("sorting and filtering people", () => {
  const rows = [
    row("Citra", { open: 10, followUpsDue: 1 }),
    row("Ayu", { open: 50, followUpsDue: 0, stale: 9 }),
    row("Dewi", { open: 900 }, { status: "Inactive" }),
    row("Budi", { open: 50, total: 80, followUpsDue: 4 }, { role: "Admin" }),
  ]
  const names = (list: Row[]) => list.map((r) => r.person.name)

  it("puts inactive people last whatever the order", () => {
    expect(names(sortTeam(rows, "open"))).toEqual(["Budi", "Ayu", "Citra", "Dewi"])
    expect(names(sortTeam(rows, "name"))).toEqual(["Ayu", "Budi", "Citra", "Dewi"])
  })

  it("orders by follow-ups due, then stuck leads, for Most overdue", () => {
    expect(names(sortTeam(rows, "overdue"))).toEqual(["Budi", "Citra", "Ayu", "Dewi"])
  })

  it("filters by role", () => {
    expect(names(filterTeam(rows, "Admin"))).toEqual(["Budi"])
    expect(filterTeam(rows, "")).toHaveLength(4)
  })
})

describe("grouping waiting chats per person", () => {
  const base = { mode: "human", last_inbound_at: null, last_message_at: null }
  const wroteLast = { last_inbound_at: "2026-11-13T02:00:00Z", last_message_at: "2026-11-13T02:00:00Z" }

  it("uses the inbox rule as seen by the chat's owner", () => {
    const grouped = groupWaitingChats(
      [
        // Handoff nobody took, assigned to A: waiting, counted for A.
        { ...base, taken_over_by: null, assigned_sales_id: "A" },
        // Handoff with no owner at all: waiting for the team only.
        { ...base, taken_over_by: null, assigned_sales_id: null },
        // B took it over and the customer wrote last: waiting, counted for B (not the assignee A).
        { ...base, ...wroteLast, taken_over_by: "B", assigned_sales_id: "A" },
        // B took it over and replied last: not waiting.
        { ...base, taken_over_by: "B", assigned_sales_id: "B", last_inbound_at: "2026-11-13T01:00:00Z", last_message_at: "2026-11-13T02:00:00Z" },
        // The AI is answering: never waiting.
        { ...base, ...wroteLast, mode: "bot", taken_over_by: null, assigned_sales_id: "A" },
      ],
      attentionOf,
    )
    expect(grouped).toEqual({ total: 3, byPerson: { A: 1, B: 1 } })
  })
})

describe("URLs", () => {
  it("reads unknown params as the defaults", () => {
    expect(parseTeamParams({ period: "365", sort: "x", role: "Owner" })).toEqual({ period: "30", sort: "open", role: "" })
    expect(parseTeamParams({ period: "7", sort: "overdue", role: "Digital Marketing" })).toEqual({
      period: "7",
      sort: "overdue",
      role: "Digital Marketing",
    })
  })

  it("writes only the params that differ from the defaults", () => {
    expect(teamHref({})).toBe("/sales")
    expect(teamHref({ period: "90", role: "Sales" })).toBe("/sales?period=90&role=Sales")
    expect(teamHref({ period: "7" }, "/sales/abc")).toBe("/sales/abc?period=7")
  })

  it("links each number to the Leads list with the Overview's own filters", () => {
    const links = personLinks("p1", { from: "2026-10-15", to: "2026-11-13" })
    expect(links.followUpsDue).toBe("/leads?sales=p1&view=followup&sort=followup")
    expect(links.stale).toBe("/leads?sales=p1&view=stale&sort=longest")
    expect(links.deals).toBe("/leads?status=Deal&sales=p1&sfrom=2026-10-15&sto=2026-11-13")
    expect(links.added).toBe("/leads?sales=p1&from=2026-10-15&to=2026-11-13")
  })
})
