import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { testGoogleCalendar, testOpenAi, testSupabase, testWebPush, testWhatsApp } = await import("./checks")
const { probe } = await import("./probe")

type Call = { url: string; init?: RequestInit }

function fakeFetch(...responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = []
  const queue = [...responses]
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const next = queue.shift() ?? { status: 500, body: null }
    return new Response(JSON.stringify(next.body), { status: next.status })
  })
  return { fn, calls }
}

function noNetwork() {
  return vi.fn(async () => {
    throw new Error("the network must not be called")
  })
}

const OPENAI = { OPENAI_API_KEY: "sk-proj-SECRETkey0000000000", OPENAI_MODEL: "gpt-test" }
const WHATSAPP = {
  WHATSAPP_ACCESS_TOKEN: "EAASECRETtoken1234567890",
  WHATSAPP_PHONE_NUMBER_ID: "109876543210987",
  WHATSAPP_VERIFY_TOKEN: "verify",
  WHATSAPP_APP_SECRET: "appsecret",
}

describe("timeouts", () => {
  it("reports a timeout instead of hanging, and never throws", async () => {
    const hang = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
        }),
    )
    const result = await probe(hang, "https://example.test", {}, 20)
    expect(result.kind).toBe("timeout")
  })

  it("maps a timed-out OpenAI call to a timeout error, not a success", async () => {
    const timeout = vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError")
    })
    const result = await testOpenAi(OPENAI, timeout)
    expect(result).toMatchObject({ state: "error", code: "timeout" })
  })

  it("maps an unreachable host to a network error", async () => {
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    expect(await testWhatsApp(WHATSAPP, down)).toMatchObject({ state: "error", code: "network" })
  })
})

describe("OpenAI", () => {
  it("returns missing without a network call when a key is not set", async () => {
    const fetchFn = noNetwork()
    expect(await testOpenAi({ OPENAI_MODEL: "gpt-test" }, fetchFn)).toEqual({ state: "missing", missing: ["OPENAI_API_KEY"] })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("only reads the model (GET), never a completion", async () => {
    const { fn, calls } = fakeFetch({ status: 200, body: { id: "gpt-test" } })
    expect(await testOpenAi(OPENAI, fn)).toMatchObject({ state: "ok" })
    expect(calls[0].url).toBe("https://api.openai.com/v1/models/gpt-test")
    expect(calls[0].init?.method ?? "GET").toBe("GET")
  })

  it.each([
    [401, { error: { code: "invalid_api_key", message: "Incorrect API key provided: sk-proj-SECRETkey0000000000" } }, /rejected the API key/],
    [404, { error: { code: "model_not_found", message: "The model does not exist" } }, /no model called .*gpt-test/],
    [429, { error: { code: "insufficient_quota", type: "insufficient_quota" } }, /no credit left/],
    [429, { error: { code: "rate_limit_exceeded" } }, /limiting requests/],
    [503, null, /problem on its side/],
  ])("maps HTTP %i to a plain explanation", async (status, body, pattern) => {
    const { fn } = fakeFetch({ status, body })
    const result = await testOpenAi(OPENAI, fn)
    expect(result.state).toBe("error")
    expect(JSON.stringify(result)).toMatch(pattern)
    expect(JSON.stringify(result)).not.toContain("SECRET")
  })
})

describe("WhatsApp", () => {
  it("returns missing without a network call", async () => {
    const fetchFn = noNetwork()
    expect(await testWhatsApp({}, fetchFn)).toEqual({
      state: "missing",
      missing: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("reads the phone number details with a GET and shows them", async () => {
    const { fn, calls } = fakeFetch({
      status: 200,
      body: { display_phone_number: "+62 811 0000", verified_name: "FSI", quality_rating: "GREEN" },
    })
    const result = await testWhatsApp(WHATSAPP, fn)
    expect(result).toMatchObject({ state: "ok", lines: ["Number: +62 811 0000", "Business name: FSI", "Quality rating: GREEN"] })
    expect(calls[0].url).toBe(
      "https://graph.facebook.com/v23.0/109876543210987?fields=display_phone_number,verified_name,quality_rating",
    )
    expect(calls[0].init?.method ?? "GET").toBe("GET")
    expect(calls[0].url).not.toContain("messages")
  })

  it.each([
    [400, 190, /access token/],
    [400, 100, /phone number id/],
    [403, 200, /permission/],
    [429, 80007, /limiting/],
    [500, 2, /problem on its side/],
  ])("maps HTTP %i, Meta code %i", async (status, code, pattern) => {
    const { fn } = fakeFetch({ status, body: { error: { code, message: "token EAASECRETtoken1234567890 bad" } } })
    const result = await testWhatsApp(WHATSAPP, fn)
    expect(result).toMatchObject({ state: "error", code: `meta_${code}` })
    expect(JSON.stringify(result)).toMatch(pattern)
    expect(JSON.stringify(result)).not.toContain("SECRET")
  })
})

describe("Web Push", () => {
  it("returns missing when keys are not set", () => {
    expect(testWebPush({})).toMatchObject({ state: "missing" })
  })

  it("accepts a well formed key pair and sends nothing", () => {
    const publicKey = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString("base64url")
    const privateKey = Buffer.alloc(32, 2).toString("base64url")
    expect(
      testWebPush({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: "mailto:it@example.test" }),
    ).toMatchObject({ state: "ok" })
  })

  it("rejects malformed keys without echoing them", () => {
    const result = testWebPush({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "SECRETshort", VAPID_PRIVATE_KEY: "SECRETx", VAPID_SUBJECT: "it" })
    expect(result).toMatchObject({ state: "error", code: "vapid_invalid" })
    expect(JSON.stringify(result)).not.toContain("SECRET")
  })
})

describe("Google Calendar", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const env = {
    GOOGLE_CALENDAR_ID: "fsi@group.calendar.google.com",
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      client_email: "crm@fsi.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    }),
  }

  it("returns missing without a network call", async () => {
    const fetchFn = noNetwork()
    expect(await testGoogleCalendar({}, fetchFn)).toMatchObject({ state: "missing" })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("reads the calendar's metadata only", async () => {
    const { fn, calls } = fakeFetch({ status: 200, body: { access_token: "ya29.token" } }, { status: 200, body: { summary: "FSI" } })
    expect(await testGoogleCalendar(env, fn)).toMatchObject({ state: "ok", lines: ["Calendar found: FSI."] })
    expect(calls[1].url).toBe("https://www.googleapis.com/calendar/v3/calendars/fsi%40group.calendar.google.com")
  })

  it("says the calendar must be shared when Google answers 404", async () => {
    const { fn } = fakeFetch({ status: 200, body: { access_token: "ya29.token" } }, { status: 404, body: null })
    const result = await testGoogleCalendar(env, fn)
    expect(JSON.stringify(result)).toMatch(/must share it with crm@fsi.iam.gserviceaccount.com/)
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY")
  })

  it("maps a rejected key", async () => {
    const { fn } = fakeFetch({ status: 400, body: { error: "invalid_grant" } })
    expect(await testGoogleCalendar(env, fn)).toMatchObject({ state: "error", code: "invalid_grant" })
  })
})

describe("Supabase", () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub" }
  const ok = async () => ({ error: null })

  it("reads as the user and with the secret key when it is set", async () => {
    const asServer = vi.fn(ok)
    const result = await testSupabase(env, { asUser: ok, asServer })
    expect(result).toMatchObject({ state: "ok" })
    expect(asServer).toHaveBeenCalledOnce()
  })

  it("says when the server read was skipped", async () => {
    const result = await testSupabase(env, { asUser: ok, asServer: null })
    expect(JSON.stringify(result)).toMatch(/Secret key not set/)
  })

  it("maps a permission error", async () => {
    const result = await testSupabase(env, {
      asUser: async () => ({ error: { code: "42501", message: "permission denied for table leads" } }),
      asServer: null,
    })
    expect(result).toMatchObject({ state: "error", code: "42501" })
  })

  it("maps an aborted read to a timeout", async () => {
    const result = await testSupabase(env, {
      asUser: (signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve({ error: { message: "AbortError" } }))
          // Simulate the 8 second limit passing.
          Object.defineProperty(signal, "aborted", { value: true })
          signal.dispatchEvent(new Event("abort"))
        }),
      asServer: null,
    })
    expect(result).toMatchObject({ state: "error", code: "timeout" })
  })
})
