import { beforeEach, describe, expect, it, vi } from "vitest"

// A fake Supabase client with a fake Storage bucket: reads and the update are
// scripted per test, and every update and file removal is recorded. Nothing
// here talks to a database or to Storage.
type Result = { data: unknown; error: { message: string } | null }

const BASE = "https://example.supabase.co"
const ID = "11111111-2222-4333-8444-555555555555"

const fake: {
  current: Result
  updated: Result
  removeResult: Result
  updates: Array<Record<string, unknown>>
  removed: string[][]
} = {
  current: { data: null, error: null },
  updated: { data: [], error: null },
  removeResult: { data: [], error: null },
  updates: [],
  removed: [],
}

const fakeClient = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => fake.current }) }),
    update: (changes: Record<string, unknown>) => ({
      eq: () => ({
        select: async () => {
          fake.updates.push(changes)
          return fake.updated
        },
      }),
    }),
  }),
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${BASE}/storage/v1/object/public/${bucket}/${path}` } }),
      remove: async (paths: string[]) => {
        fake.removed.push(paths)
        return fake.removeResult
      },
    }),
  },
}

const profile = { id: "admin-1", role: "Admin" }

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeClient }))
vi.mock("@/lib/supabase/env", () => ({ supabaseEnv: () => ({ url: BASE, key: "test" }) }))
vi.mock("@/lib/auth", () => ({
  getProfile: async () => profile,
  isAdmin: (p: { role: string }) => p.role === "Admin",
}))

const { setSalespersonPhoto } = await import("./actions")
const { revalidatePath } = await import("next/cache")

const newPath = `${ID}/1763020800000.jpg`
const publicUrl = (path: string) => `${BASE}/storage/v1/object/public/sales-avatar/${path}`

beforeEach(() => {
  profile.role = "Admin"
  fake.current = { data: { id: ID, avatar_url: null }, error: null }
  fake.updated = { data: [{ id: ID }], error: null }
  fake.removeResult = { data: [{ name: "x" }], error: null }
  fake.updates = []
  fake.removed = []
  vi.mocked(revalidatePath).mockClear()
})

describe("setSalespersonPhoto", () => {
  it("refuses someone who is not an Admin and touches nothing", async () => {
    profile.role = "Sales"
    const state = await setSalespersonPhoto(ID, newPath)
    expect(state.result).toBe("error")
    expect(state.message).toMatch(/only an Admin/)
    expect(fake.updates).toEqual([])
    expect(fake.removed).toEqual([])
  })

  it("refuses an id that is not a UUID", async () => {
    const state = await setSalespersonPhoto("p1", "p1/1.jpg")
    expect(state.result).toBe("error")
    expect(fake.updates).toEqual([])
    expect(fake.removed).toEqual([])
  })

  it("refuses a path outside the person's folder and deletes nothing", async () => {
    for (const path of ["rist.jpeg", `other-id/${ID}/1.jpg`, `${ID}/../rist.jpeg`, `${ID}/`]) {
      const state = await setSalespersonPhoto(ID, path)
      expect(state.result).toBe("error")
    }
    expect(fake.updates).toEqual([])
    expect(fake.removed).toEqual([])
  })

  it("saves the public URL built on the server and revalidates the team and the layout", async () => {
    const state = await setSalespersonPhoto(ID, newPath)
    expect(state).toEqual({ result: "saved", message: "Photo saved." })
    expect(fake.updates).toEqual([{ avatar_url: publicUrl(newPath) }])
    expect(fake.removed).toEqual([])
    expect(revalidatePath).toHaveBeenCalledWith("/sales")
    expect(revalidatePath).toHaveBeenCalledWith(`/sales/${ID}`)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("treats an update that touched no row as a failure and removes the uploaded file", async () => {
    fake.updated = { data: [], error: null }
    const state = await setSalespersonPhoto(ID, newPath)
    expect(state.result).toBe("error")
    expect(state.message).toMatch(/removed again/)
    expect(fake.removed).toEqual([[newPath]])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("removes the uploaded file when the update fails, and says when that removal fails too", async () => {
    fake.updated = { data: null, error: { message: "connection reset" } }
    fake.removeResult = { data: [], error: null }
    const state = await setSalespersonPhoto(ID, newPath)
    expect(state.result).toBe("error")
    expect(state.message).toMatch(/connection reset/)
    expect(state.message).toMatch(/could not be removed either/)
    expect(fake.removed).toEqual([[newPath]])
  })

  it("deletes the replaced photo only when it is in the person's own folder", async () => {
    fake.current = { data: { id: ID, avatar_url: publicUrl(`${ID}/1.png`) }, error: null }
    await setSalespersonPhoto(ID, newPath)
    expect(fake.removed).toEqual([[`${ID}/1.png`]])
  })

  it("removes a photo by clearing the column first and never deletes a file at the bucket root", async () => {
    fake.current = { data: { id: ID, avatar_url: publicUrl("rist.jpeg") }, error: null }
    const state = await setSalespersonPhoto(ID, null)
    expect(state).toEqual({ result: "saved", message: "Photo removed." })
    expect(fake.updates).toEqual([{ avatar_url: null }])
    expect(fake.removed).toEqual([])
  })

  it("removes a photo from the person's folder after clearing the column", async () => {
    fake.current = { data: { id: ID, avatar_url: publicUrl(`${ID}/1.webp`) }, error: null }
    const state = await setSalespersonPhoto(ID, null)
    expect(state.result).toBe("saved")
    expect(fake.removed).toEqual([[`${ID}/1.webp`]])
  })

  it("does not delete anything when clearing the column fails", async () => {
    fake.current = { data: { id: ID, avatar_url: publicUrl(`${ID}/1.webp`) }, error: null }
    fake.updated = { data: [], error: null }
    const state = await setSalespersonPhoto(ID, null)
    expect(state.result).toBe("error")
    expect(fake.removed).toEqual([])
  })
})
