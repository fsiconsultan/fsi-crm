import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { addressOf, emailConfig, mapResendError, testResend } = await import("./email")

const ENV = { RESEND_API_KEY: "re_live_SECRETkey_123456", EMAIL_FROM: "French Solar Industry <crm@fsi.example>" }

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    void url
    void init
    return new Response(JSON.stringify(body), { status })
  })
}

describe("email config", () => {
  it("reads the sender address and reports missing keys", () => {
    expect(addressOf("French Solar Industry <crm@fsi.example>")).toBe("crm@fsi.example")
    expect(addressOf("crm@fsi.example")).toBe("crm@fsi.example")
    expect(addressOf("FSI")).toBeNull()
    expect(emailConfig({})).toEqual({ state: "missing", missing: ["RESEND_API_KEY", "EMAIL_FROM"] })
    expect(emailConfig({ ...ENV, EMAIL_FROM: "FSI" })).toMatchObject({ state: "invalid" })
  })

  it("maps Resend errors without echoing the key", () => {
    expect(mapResendError(401, { name: "invalid_api_key", message: "API key is invalid" }, ENV).message).toMatch(/rejected the API key/)
    expect(mapResendError(403, { name: "validation_error", message: "The fsi.example domain is not verified" }, ENV).message).toMatch(
      /sender domain is not verified/,
    )
    expect(mapResendError(429, null, ENV).message).toMatch(/limiting/)
    const leaked = mapResendError(400, { message: `bad key ${ENV.RESEND_API_KEY}` }, ENV)
    expect(leaked.message).not.toContain("SECRETkey")
  })
})

describe("Resend connection test (read-only)", () => {
  it("returns missing without a network call", async () => {
    const fn = fakeFetch(200, {})
    expect(await testResend({}, fn)).toMatchObject({ state: "missing" })
    expect(fn).not.toHaveBeenCalled()
  })

  it("only lists domains, and confirms the sender domain is verified", async () => {
    const fn = fakeFetch(200, { data: [{ name: "fsi.example", status: "verified" }] })
    expect(await testResend(ENV, fn)).toMatchObject({ state: "ok", lines: ["The key works and fsi.example is verified.", "No email was sent."] })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0][0]).toBe("https://api.resend.com/domains")
    expect(fn.mock.calls[0][1]?.method ?? "GET").toBe("GET")
  })

  it("says when the domain is missing or not verified", async () => {
    expect(await testResend(ENV, fakeFetch(200, { data: [] }))).toMatchObject({ state: "error", code: "domain_missing" })
    expect(await testResend(ENV, fakeFetch(200, { data: [{ name: "fsi.example", status: "pending" }] }))).toMatchObject({
      state: "error",
      code: "domain_not_verified",
    })
  })

  it("accepts a sending-only key without claiming the domain is verified", async () => {
    const result = await testResend(ENV, fakeFetch(401, { name: "restricted_api_key", message: "restricted" }))
    expect(result).toMatchObject({ state: "ok" })
    expect(JSON.stringify(result)).toMatch(/Check in Resend that fsi.example is verified/)
  })
})
