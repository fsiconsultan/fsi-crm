import { describe, expect, it } from "vitest"
import { createCloudApi } from "./cloud-api"
import { applyStatus } from "./ingest"
import { sendAndRecord } from "./outbound"
import { createMemoryStore } from "./testing/memory-store"

function fakeFetch(status: number, json: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fn = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify(json), { status })
  }) as typeof fetch
  return { fn, calls }
}

const config = { accessToken: "test-token", phoneNumberId: "PHONE_ID" }

describe("Cloud API client", () => {
  it("sends a text message and returns Meta's message id", async () => {
    const { fn, calls } = fakeFetch(200, { messages: [{ id: "wamid.OUT1" }] })
    const result = await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")

    expect(result).toEqual({ ok: true, waMessageId: "wamid.OUT1" })
    expect(calls[0].url).toBe("https://graph.facebook.com/v23.0/PHONE_ID/messages")
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-token")
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "6281200000001",
      type: "text",
      text: { preview_url: false, body: "Halo" },
    })
  })

  it("sends a template message", async () => {
    const { fn, calls } = fakeFetch(200, { messages: [{ id: "wamid.OUT2" }] })
    await createCloudApi({ ...config, fetch: fn }).sendTemplate("6281200000001", "follow_up", "id", ["Budi"])

    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      type: "template",
      template: {
        name: "follow_up",
        language: { code: "id" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Budi" }] }],
      },
    })
  })

  it("reports not_configured without calling Meta when credentials are missing", async () => {
    const { fn, calls } = fakeFetch(200, {})
    const result = await createCloudApi({ fetch: fn }).sendText("6281200000001", "Halo")
    expect(result).toMatchObject({ ok: false, kind: "not_configured" })
    expect(calls).toHaveLength(0)
  })

  it.each([
    [400, 131047, "outside_window"],
    [401, 190, "auth"],
    [429, 130429, "rate_limited"],
    [400, 131026, "recipient_unreachable"],
    [400, 132001, "template"],
    [500, 131000, "unknown"],
  ] as const)("maps HTTP %i / Meta code %i to %s", async (status, code, kind) => {
    const { fn } = fakeFetch(status, { error: { code, message: "Meta says no", error_data: { details: "Because." } } })
    const result = await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")
    expect(result).toMatchObject({ ok: false, kind, code: String(code) })
    expect(!result.ok && result.message).toContain("Because.")
  })

  it("treats a 200 without a message id as a failure, not a success", async () => {
    const { fn } = fakeFetch(200, { messages: [] })
    expect((await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")).ok).toBe(false)
  })

  it("reports a Meta call that took too long as 'not known', not as a plain failure", async () => {
    const fn = (async () => {
      throw new DOMException("The operation timed out.", "TimeoutError")
    }) as unknown as typeof fetch
    const result = await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")
    expect(result).toMatchObject({ ok: false, kind: "timeout" })
    expect(!result.ok && result.message).toContain("not known")
  })

  it("passes a timeout signal on every Meta call", async () => {
    const { fn, calls } = fakeFetch(200, { messages: [{ id: "wamid.OUT1" }] })
    await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  it("reports a network failure instead of throwing", async () => {
    const fn = (async () => {
      throw new TypeError("fetch failed")
    }) as unknown as typeof fetch
    const result = await createCloudApi({ ...config, fetch: fn }).sendText("6281200000001", "Halo")
    expect(result).toMatchObject({ ok: false, kind: "network" })
  })
})

describe("sendAndRecord", () => {
  const now = new Date("2026-11-12T12:00:00Z")

  async function conversation(lastInboundAt: string | null) {
    const db = createMemoryStore()
    const created = await db.store.createConversation({
      waId: "6281200000001",
      profileName: null,
      phoneNumberId: null,
      leadId: null,
      assignedSalesId: null,
    })
    await db.store.updateConversation(created.id, { last_inbound_at: lastInboundAt })
    return { db, conversation: (await db.store.getConversation(created.id))! }
  }

  it("refuses free text outside the 24-hour window without calling Meta, and records the failure", async () => {
    const { db, conversation: c } = await conversation("2026-11-11T11:00:00Z")
    const { fn, calls } = fakeFetch(200, { messages: [{ id: "wamid.SHOULD_NOT_HAPPEN" }] })

    const { result } = await sendAndRecord({
      store: db.store,
      api: createCloudApi({ ...config, fetch: fn }),
      conversation: c,
      content: { type: "text", body: "Are you still interested?" },
      sender: { type: "human", salesId: "sales-1" },
      now,
    })

    expect(result).toMatchObject({ ok: false, kind: "outside_window" })
    expect(calls).toHaveLength(0)
    expect(db.messages).toEqual([
      expect.objectContaining({ status: "failed", wa_message_id: null, sender_type: "human", sender_sales_id: "sales-1" }),
    ])
    expect(db.messages[0].error_message).toContain("24 hours")
    expect(db.events).toEqual([expect.objectContaining({ type: "send_failed", needs_review: true })])
  })

  it("still allows a template outside the window", async () => {
    const { db, conversation: c } = await conversation("2026-11-01T00:00:00Z")
    const { fn } = fakeFetch(200, { messages: [{ id: "wamid.TPL" }] })

    const { result } = await sendAndRecord({
      store: db.store,
      api: createCloudApi({ ...config, fetch: fn }),
      conversation: c,
      content: { type: "template", name: "follow_up", languageCode: "id", body: "[Template: follow_up]" },
      sender: { type: "human", salesId: "sales-1" },
      now,
    })

    expect(result.ok).toBe(true)
    expect(db.messages[0]).toMatchObject({ status: "sent", wa_message_id: "wamid.TPL", message_type: "template" })
  })

  it("never records a rejected send as sent", async () => {
    const { db, conversation: c } = await conversation("2026-11-12T11:00:00Z")
    const { fn } = fakeFetch(401, { error: { code: 190, message: "Token expired" } })

    await sendAndRecord({
      store: db.store,
      api: createCloudApi({ ...config, fetch: fn }),
      conversation: c,
      content: { type: "text", body: "Halo" },
      sender: { type: "bot" },
      now,
    })

    expect(db.messages[0]).toMatchObject({ status: "failed", error_code: "190", wa_message_id: null })
    expect(db.conversations[0].last_message_preview).toBeNull()
  })

  it("stores the message as pending before calling Meta, then fills in the result", async () => {
    const { db, conversation: c } = await conversation("2026-11-12T11:00:00Z")
    let seenDuringSend: string | undefined
    const api = {
      async sendText() {
        seenDuringSend = db.messages[0]?.status
        return { ok: true as const, waMessageId: "wamid.FAST" }
      },
      async sendTemplate(): Promise<never> {
        throw new Error("not used")
      },
    }
    await sendAndRecord({ store: db.store, api, conversation: c, content: { type: "text", body: "Halo" }, sender: { type: "bot" }, now })
    expect(seenDuringSend).toBe("pending")
    expect(db.messages).toEqual([expect.objectContaining({ status: "sent", wa_message_id: "wamid.FAST" })])
  })

  it("applies a 'failed' update that Meta sent before the send was recorded", async () => {
    const { db, conversation: c } = await conversation("2026-11-12T11:00:00Z")
    const api = {
      async sendText() {
        // Meta's status webhook wins the race against our own write.
        await applyStatus(db.store, {
          kind: "status",
          waMessageId: "wamid.RACE",
          status: "failed",
          errorCode: "131026",
          errorMessage: "Message undeliverable",
        })
        return { ok: true as const, waMessageId: "wamid.RACE" }
      },
      async sendTemplate(): Promise<never> {
        throw new Error("not used")
      },
    }
    await sendAndRecord({ store: db.store, api, conversation: c, content: { type: "text", body: "Halo" }, sender: { type: "bot" }, now })
    expect(db.messages[0]).toMatchObject({ status: "failed", error_code: "131026" })
    expect(db.held).toEqual([])
    expect(db.events).toContainEqual(expect.objectContaining({ type: "send_failed", needs_review: true }))
  })
})

