import { beforeEach, describe, expect, it, vi } from "vitest"

// A fake Supabase client: the person read and the update are scripted per test,
// and every update is recorded. Nothing here talks to a database.
type Result = { data: unknown; error: { message: string } | null }

const db: { current: Result; updated: Result; updates: Array<{ changes: Record<string, unknown>; id: unknown }> } = {
  current: { data: null, error: null },
  updated: { data: [], error: null },
  updates: [],
}

const fakeClient = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => db.current }) }),
    update: (changes: Record<string, unknown>) => ({
      eq: (_column: string, id: unknown) => ({
        select: async () => {
          db.updates.push({ changes, id })
          return db.updated
        },
      }),
    }),
  }),
}

const profile = { id: "admin-1", role: "Admin" }

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeClient }))
vi.mock("@/lib/auth", () => ({
  getProfile: async () => profile,
  isAdmin: (p: { role: string }) => p.role === "Admin",
}))

const { setSalespersonStatus, updateSalesperson } = await import("./actions")

const idle = { result: "idle" as const, message: "", fieldErrors: {}, values: {} }

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

beforeEach(() => {
  profile.role = "Admin"
  db.updates = []
  db.current = { data: null, error: null }
  db.updated = { data: [], error: null }
})

describe("updateSalesperson", () => {
  it("saves a changed name and role and reports success", async () => {
    db.current = { data: { id: "p1", name: "Ayu", role: "Sales", status: "Active" }, error: null }
    db.updated = { data: [{ id: "p1" }], error: null }
    const state = await updateSalesperson("p1", idle, form({ name: "Ayu Lestari", role: "Secretary", status: "Active" }))
    expect(state.result).toBe("saved")
    expect(db.updates).toEqual([{ changes: { name: "Ayu Lestari", role: "Secretary" }, id: "p1" }])
  })

  it("refuses to change the signed-in Admin's own role or status and writes nothing", async () => {
    db.current = { data: { id: "admin-1", name: "Owner", role: "Admin", status: "Active" }, error: null }
    const state = await updateSalesperson("admin-1", idle, form({ name: "Owner", role: "Sales", status: "Inactive" }))
    expect(state.result).toBe("error")
    expect(state.fieldErrors.role).toMatch(/your own role/)
    expect(state.fieldErrors.status).toMatch(/your own account/)
    expect(db.updates).toEqual([])
  })

  it("reports a failed write as a failure, never as saved", async () => {
    db.current = { data: { id: "p1", name: "Ayu", role: "Sales", status: "Active" }, error: null }
    db.updated = { data: null, error: { message: "connection reset" } }
    const state = await updateSalesperson("p1", idle, form({ name: "Ayu", role: "Admin", status: "Active" }))
    expect(state).toMatchObject({ result: "error", message: "Nothing was saved: connection reset. Try again." })
  })

  it("treats an update that touched no row as a failure", async () => {
    db.current = { data: { id: "p1", name: "Ayu", role: "Sales", status: "Active" }, error: null }
    db.updated = { data: [], error: null }
    const state = await updateSalesperson("p1", idle, form({ name: "Ayu", role: "Admin", status: "Active" }))
    expect(state.result).toBe("error")
  })

  it("does nothing for someone who is not an Admin", async () => {
    profile.role = "Sales"
    const state = await updateSalesperson("p1", idle, form({ name: "X", role: "Admin", status: "Active" }))
    expect(state.result).toBe("error")
    expect(db.updates).toEqual([])
  })
})

describe("setSalespersonStatus", () => {
  const start = { result: "idle" as const, message: "" }

  it("deactivates a person and says they cannot sign in", async () => {
    db.updated = { data: [{ id: "p1", name: "Ayu", username: "ayu" }], error: null }
    const state = await setSalespersonStatus("p1", start, form({ status: "Inactive" }))
    expect(state).toEqual({ result: "saved", message: "Ayu is now inactive and cannot sign in." })
    expect(db.updates).toEqual([{ changes: { status: "Inactive" }, id: "p1" }])
  })

  it("activates a person again", async () => {
    db.updated = { data: [{ id: "p1", name: null, username: "ayu" }], error: null }
    const state = await setSalespersonStatus("p1", start, form({ status: "Active" }))
    expect(state).toEqual({ result: "saved", message: "ayu is active again and can sign in." })
  })

  it("never lets the Admin change their own status", async () => {
    const state = await setSalespersonStatus("admin-1", start, form({ status: "Inactive" }))
    expect(state.result).toBe("error")
    expect(db.updates).toEqual([])
  })

  it("rejects a status the database does not allow", async () => {
    const state = await setSalespersonStatus("p1", start, form({ status: "Deleted" }))
    expect(state.result).toBe("error")
    expect(db.updates).toEqual([])
  })

  it("reports a failed write as a failure", async () => {
    db.updated = { data: null, error: { message: "permission denied" } }
    const state = await setSalespersonStatus("p1", start, form({ status: "Inactive" }))
    expect(state).toEqual({ result: "error", message: "Nothing was saved: permission denied. Try again." })
  })

  it("reports a write that matched nobody as a failure", async () => {
    db.updated = { data: [], error: null }
    const state = await setSalespersonStatus("p1", start, form({ status: "Inactive" }))
    expect(state.result).toBe("error")
  })
})
