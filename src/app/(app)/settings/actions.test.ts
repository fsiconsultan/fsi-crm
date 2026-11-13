import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const role = { current: "Sales" }
const createClient = vi.fn()
const createAdminClient = vi.fn(() => null)

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(async () => ({ id: "user-1", role: role.current })),
  isAdmin: (profile: { role: string }) => profile.role === "Admin",
}))
vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/whatsapp/admin-client", () => ({ createAdminClient }))

const actions = await import("./actions")

const ALL = [
  ["testSupabaseConnection", actions.testSupabaseConnection],
  ["testWhatsAppConnection", actions.testWhatsAppConnection],
  ["testOpenAiConnection", actions.testOpenAiConnection],
  ["testPushConnection", actions.testPushConnection],
  ["testCalendarConnection", actions.testCalendarConnection],
  ["testEmailConnection", actions.testEmailConnection],
] as const

describe("settings actions", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch")

  beforeEach(() => {
    fetchSpy.mockReset()
    fetchSpy.mockRejectedValue(new Error("the network must not be called"))
    createClient.mockReset()
  })

  it.each(["Sales", "Digital Marketing", "Secretary"])("refuses every test for %s", async (name) => {
    role.current = name
    for (const [label, action] of ALL) {
      expect(await action(), label).toEqual({ state: "denied" })
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it("lets an Admin run them; unset keys come back as missing with no network call", async () => {
    role.current = "Admin"
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("OPENAI_MODEL", "")
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "")
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "")
    vi.stubEnv("VAPID_PRIVATE_KEY", "")
    vi.stubEnv("GOOGLE_CALENDAR_ID", "")
    vi.stubEnv("RESEND_API_KEY", "")
    expect(await actions.testOpenAiConnection()).toMatchObject({ state: "missing" })
    expect(await actions.testWhatsAppConnection()).toMatchObject({ state: "missing" })
    expect(await actions.testPushConnection()).toMatchObject({ state: "missing" })
    expect(await actions.testCalendarConnection()).toMatchObject({ state: "missing" })
    expect(await actions.testEmailConnection()).toMatchObject({ state: "missing" })
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
