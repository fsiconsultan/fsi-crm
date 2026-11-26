import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()
const del = vi.fn()

vi.mock("@/lib/auth", () => ({ getProfile: vi.fn(async () => ({ id: "sales-1" })) }))
vi.mock("@/lib/whatsapp/inbox", () => ({
  inboxClient: async () => ({
    rpc,
    from: () => ({ delete: () => ({ eq: del }) }),
  }),
}))

const { removeDevice, saveDevice } = await import("./actions")

const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "key", auth: "auth" } }

describe("device subscription actions", () => {
  beforeEach(() => {
    rpc.mockReset()
    del.mockReset()
  })

  it("saves the subscription through the register function", async () => {
    rpc.mockResolvedValue({ error: null })
    expect(await saveDevice(subscription, "Mozilla/5.0 (iPhone)")).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledWith("register_push_subscription", {
      p_endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      p_p256dh: "key",
      p_auth: "auth",
      p_user_agent: "Mozilla/5.0 (iPhone)",
    })
  })

  it("refuses an incomplete subscription without calling the database", async () => {
    expect(await saveDevice({ endpoint: "https://push.example.test/abc" }, "ua")).toMatchObject({ ok: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("refuses an endpoint that is not a browser push service, without calling the database", async () => {
    const result = await saveDevice({ ...subscription, endpoint: "https://evil.example/collect" }, "ua")
    expect(result).toMatchObject({ ok: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("says plainly when the server is not set up yet", async () => {
    rpc.mockResolvedValue({ error: { code: "PGRST202", message: "function not found" } })
    expect(await saveDevice(subscription, "ua")).toEqual({ ok: false, error: "Notifications are not set up on the server yet." })
  })

  it("reports a database error instead of claiming success", async () => {
    rpc.mockResolvedValue({ error: { code: "P0001", message: "No CRM profile for this user" } })
    const result = await saveDevice(subscription, "ua")
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain("No CRM profile")
  })

  it("removes this device by its endpoint", async () => {
    del.mockResolvedValue({ error: null })
    expect(await removeDevice("https://push.example.test/abc")).toEqual({ ok: true })
    expect(del).toHaveBeenCalledWith("endpoint", "https://push.example.test/abc")
  })

  it("reports a failed removal", async () => {
    del.mockResolvedValue({ error: { code: "42501", message: "permission denied" } })
    expect(await removeDevice("https://push.example.test/abc")).toMatchObject({ ok: false })
  })
})
