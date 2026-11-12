import { describe, expect, it } from "vitest"
import type { CloudApi, SendResult } from "@/lib/whatsapp/cloud-api"
import { signBody } from "@/lib/whatsapp/signature"
import textMessage from "@/lib/whatsapp/testing/fixtures/text-message.json"
import { createMemoryStore } from "@/lib/whatsapp/testing/memory-store"
import { handleDelivery } from "@/lib/whatsapp/webhook"
import { createNotifier } from "@/lib/push/notify"
import { device, fakeSender, memoryPushStore } from "@/lib/push/testing/fakes"
import { answerInbound, type ReplyDeps } from "./reply"
import { call, fakeModel } from "./testing"

const SECRET = "test-app-secret"
// Twenty minutes after the fixture message, so the 24-hour window is open.
const NOW = new Date("2026-11-12T01:00:00Z")

function fakeApi(result: SendResult = { ok: true, waMessageId: "wamid.BOT_REPLY" }) {
  const sent: Array<{ to: string; body: string }> = []
  let n = 0
  const api: CloudApi = {
    async sendText(to, body) {
      sent.push({ to, body })
      return result.ok ? { ok: true, waMessageId: `${result.waMessageId}_${++n}` } : result
    },
    async sendTemplate() {
      throw new Error("not used")
    },
  }
  return { api, sent }
}

// Delivers a customer message through the real webhook handler.
async function receive(db: ReturnType<typeof createMemoryStore>, text?: string, id?: string) {
  const payload = structuredClone(textMessage)
  const message = payload.entry[0].changes[0].value.messages[0]
  if (text) message.text.body = text
  if (id) message.id = id
  const rawBody = JSON.stringify(payload)
  const { pending } = await handleDelivery({
    rawBody,
    signature: signBody(rawBody, SECRET),
    appSecret: SECRET,
    store: db.store,
    now: NOW,
  })
  return pending[0]
}

function deps(db: ReturnType<typeof createMemoryStore>, model: ReplyDeps["model"], api = fakeApi().api): ReplyDeps {
  return { store: db.store, api, model, now: () => NOW }
}

describe("AI reply", () => {
  it("answers a customer in bot mode and records the reply as sent", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const { model, calls } = fakeModel([{ content: "Halo! Boleh tahu lokasi villanya di mana?" }])
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, deps(db, model, api))).toBe("sent")
    expect(sent).toEqual([{ to: "6281200000001", body: "Halo! Boleh tahu lokasi villanya di mana?" }])
    expect(db.messages.at(-1)).toMatchObject({ direction: "outbound", sender_type: "bot", status: "sent" })
    expect(calls[0].messages[0].role).toBe("system")
    expect(calls[0].messages.at(-1)).toEqual({
      role: "user",
      content: "Halo, saya mau tanya soal panel surya untuk villa saya.",
    })
  })

  it("takeover pauses AI replies: in human mode the model is not called and nothing is sent", async () => {
    const db = createMemoryStore()
    await answerInbound(await receive(db), deps(db, fakeModel([{ content: "Halo!" }]).model))

    // A staff member takes over in the inbox.
    await db.store.updateConversation(db.conversations[0].id, {
      mode: "human",
      taken_over_by: "sales-1",
      taken_over_at: NOW.toISOString(),
    })

    const pending = await receive(db, "Berapa harganya?", "wamid.TEST_INBOUND_0002")
    const { model, calls } = fakeModel([{ content: "This must never be sent." }])
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, deps(db, model, api))).toBe("skipped_human_mode")
    expect(calls).toHaveLength(0)
    expect(sent).toHaveLength(0)
    // The customer's message is still stored for the staff member to read.
    expect(db.messages.at(-1)).toMatchObject({ direction: "inbound", body: "Berapa harganya?" })
    expect(db.conversations[0]).toMatchObject({ mode: "human", taken_over_by: "sales-1" })
  })

  it("stays paused across further messages until an explicit hand-back, then answers again", async () => {
    const db = createMemoryStore()
    await receive(db)
    await db.store.updateConversation(db.conversations[0].id, { mode: "human", taken_over_by: "sales-1" })

    for (const n of [2, 3]) {
      const pending = await receive(db, `pesan ${n}`, `wamid.TEST_INBOUND_000${n}`)
      expect(await answerInbound(pending, deps(db, fakeModel([]).model))).toBe("skipped_human_mode")
    }

    await db.store.updateConversation(db.conversations[0].id, { mode: "bot", handed_back_at: NOW.toISOString() })
    const pending = await receive(db, "Halo lagi", "wamid.TEST_INBOUND_0004")
    const { api, sent } = fakeApi()
    expect(await answerInbound(pending, deps(db, fakeModel([{ content: "Halo, ada yang bisa dibantu?" }]).model, api))).toBe(
      "sent",
    )
    expect(sent).toHaveLength(1)
  })

  it("drops the AI reply when staff take over while the model is still writing", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const { model } = fakeModel([
      async () => {
        await db.store.updateConversation(db.conversations[0].id, { mode: "human", taken_over_by: "sales-1" })
        return { content: "Too late." }
      },
    ])
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, deps(db, model, api))).toBe("suppressed_after_takeover")
    expect(sent).toHaveLength(0)
    expect(db.messages.filter((m) => m.direction === "outbound")).toHaveLength(0)
    expect(db.events.at(-1)).toMatchObject({ type: "reply_suppressed" })
  })

  it("a handoff the AI requests sends its goodbye, then silences it", async () => {
    const db = createMemoryStore()
    const pending = await receive(db, "Saya mau bicara dengan orang.")
    const { model } = fakeModel([
      { toolCalls: [call("request_human_handoff", { reason: "Customer asked for a person." })] },
      { content: "Baik, tim FSI akan membalas di sini." },
    ])
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, deps(db, model, api))).toBe("sent")
    expect(sent.map((s) => s.body)).toEqual(["Baik, tim FSI akan membalas di sini."])
    expect(db.conversations[0]).toMatchObject({ mode: "human", taken_over_by: null })
    expect(db.events).toContainEqual(expect.objectContaining({ type: "handoff_requested", needs_review: true }))

    const next = await receive(db, "Halo?", "wamid.TEST_INBOUND_0002")
    expect(await answerInbound(next, deps(db, fakeModel([]).model, api))).toBe("skipped_human_mode")
    expect(sent).toHaveLength(1)
  })

  it("only the newest customer message gets an answer when several arrive together", async () => {
    const db = createMemoryStore()
    const first = await receive(db)
    const second = await receive(db, "Lokasi di Canggu.", "wamid.TEST_INBOUND_0002")
    const { model, calls } = fakeModel([{ content: "Terima kasih!" }])

    expect(await answerInbound(first, deps(db, model))).toBe("skipped_superseded")
    expect(await answerInbound(second, deps(db, model))).toBe("sent")
    expect(calls).toHaveLength(1)
  })

  it("creates a lead, saves answers and completes qualification through the tools", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const answers = {
      property_type: "Villa",
      monthly_pln_bill_idr: "Rp 4.000.000",
      location: "Canggu",
      electrical_connection: "7.700 VA, 1 phase",
      expected_savings: "Turun setengahnya",
      contact_name: "Budi",
    }
    const { model, calls } = fakeModel([
      { toolCalls: [call("find_or_create_lead", { customer_name: "Budi" })] },
      { toolCalls: [call("save_qualification_answers", { ...answers, shoe_size: "42" })] },
      { toolCalls: [call("set_lead_status", { event: "qualification_completed" })] },
      { content: "Terima kasih Pak Budi, tim FSI akan menghubungi Anda." },
    ])

    expect(await answerInbound(pending, deps(db, model))).toBe("sent")

    expect(db.leads).toEqual([
      expect.objectContaining({ customer_name: "Budi", phone: "+6281200000001", phone_wa: "6281200000001", status: "First Contact" }),
    ])
    expect(db.conversations[0].lead_id).toBe(db.leads[0].id)
    expect(db.qualifications[0]).toMatchObject({ lead_id: db.leads[0].id, answers })
    expect(db.events.map((e) => e.type)).toEqual(["lead_created", "status_changed"])
    expect(db.events[0].detail).toMatchObject({ source: "whatsapp" })
    // The model saw each tool result before continuing.
    expect(calls[3].messages.filter((m) => m.role === "tool")).toHaveLength(3)
  })

  it("does not create a second lead for a number that already has one", async () => {
    const db = createMemoryStore({
      leads: [{ id: 7, customer_name: "Existing", phone: "0812-0000-0001", phone_wa: "6281200000001", status: "Quotation", sales_id: "sales-1" }],
    })
    const pending = await receive(db)
    const { model } = fakeModel([
      { toolCalls: [call("find_or_create_lead", { customer_name: "Someone Else" })] },
      { toolCalls: [call("set_lead_status", { event: "qualification_completed" })] },
      { content: "Halo!" },
    ])

    await answerInbound(pending, deps(db, model))

    expect(db.leads).toHaveLength(1)
    // The existing lead is untouched: same name, same human-set status.
    expect(db.leads[0]).toMatchObject({ customer_name: "Existing", status: "Quotation" })
  })

  it("refuses qualification_completed while answers are missing", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const { model, calls } = fakeModel([
      { toolCalls: [call("find_or_create_lead")] },
      { toolCalls: [call("set_lead_status", { event: "qualification_completed" })] },
      { content: "Boleh tahu lokasinya?" },
    ])

    await answerInbound(pending, deps(db, model))

    expect(db.leads[0].status).toBe("New")
    const toolResult = calls[2].messages.at(-1)
    expect(toolResult?.role === "tool" && JSON.parse(toolResult.content)).toMatchObject({ status: "refused" })
  })

  it("tells the model the calculation and booking are not configured, with no numbers to relay", async () => {
    const db = createMemoryStore()
    const pending = await receive(db, "Berapa harga sistem 5 kWp? Bisa survey besok?")
    const { model, calls } = fakeModel([
      {
        toolCalls: [
          call("calculate_indicative_system", { monthly_pln_bill_idr: "Rp 4.000.000" }),
          call("book_site_visit", { preferred_time: "besok pagi" }),
        ],
      },
      { content: "Tim FSI akan menyiapkan perhitungannya dan mengonfirmasi jadwal survey." },
    ])

    await answerInbound(pending, deps(db, model))

    const results = calls[1].messages.filter((m) => m.role === "tool").map((m) => JSON.parse(m.content as string))
    expect(results).toHaveLength(2)
    for (const result of results) {
      expect(result.status).toBe("not_configured")
      expect(JSON.stringify(result)).not.toMatch(/\d/)
    }
  })

  it("logs for review, once, when the AI is not configured, and sends nothing", async () => {
    const db = createMemoryStore()
    const { api, sent } = fakeApi()

    expect(await answerInbound(await receive(db), deps(db, null, api))).toBe("skipped_not_configured")
    expect(await answerInbound(await receive(db, "Halo?", "wamid.TEST_INBOUND_0002"), deps(db, null, api))).toBe(
      "skipped_not_configured",
    )
    expect(sent).toHaveLength(0)
    expect(db.events.filter((e) => e.type === "ai_not_configured")).toHaveLength(1)
    expect(db.events[0].needs_review).toBe(true)
  })

  it("logs a model failure for review instead of throwing or replying", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const model = {
      async complete(): Promise<never> {
        throw new Error("429 rate limit")
      },
    }
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, deps(db, model, api))).toBe("error")
    expect(sent).toHaveLength(0)
    expect(db.events.at(-1)).toMatchObject({ type: "ai_error", needs_review: true, severity: "error" })
    expect(db.events.at(-1)?.summary).toContain("429 rate limit")
  })

  it("logs a failing tool and tells the model it failed", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    db.store.createLead = async () => {
      throw new Error("Create lead: permission denied")
    }
    const { model, calls } = fakeModel([
      { toolCalls: [call("find_or_create_lead")] },
      { content: "Tim kami akan menghubungi Anda." },
    ])

    await answerInbound(pending, deps(db, model))

    expect(db.events).toContainEqual(expect.objectContaining({ type: "tool_failed", needs_review: true }))
    const toolResult = calls[1].messages.at(-1)
    expect(toolResult?.role === "tool" && JSON.parse(toolResult.content).status).toBe("error")
  })

  it("records a rejected bot reply as failed, never as sent", async () => {
    const db = createMemoryStore()
    const pending = await receive(db)
    const { api } = fakeApi({ ok: false, kind: "auth", code: "190", message: "WhatsApp rejected our access token." })

    expect(await answerInbound(pending, deps(db, fakeModel([{ content: "Halo!" }]).model, api))).toBe("send_failed")
    expect(db.messages.at(-1)).toMatchObject({ sender_type: "bot", status: "failed", error_code: "190" })
    expect(db.events.at(-1)).toMatchObject({ type: "send_failed", needs_review: true })
  })

  it("notifies the assigned salesperson's phone when the AI asks for a person", async () => {
    const db = createMemoryStore({
      leads: [{ id: 7, customer_name: "Existing", phone: "0812-0000-0001", phone_wa: "6281200000001", status: null, sales_id: "sales-1" }],
    })
    const pending = await receive(db, "Saya mau bicara dengan orang.")
    const push = memoryPushStore({ targets: [device("phone", "sales-1")] })
    const { sender, sent } = fakeSender()
    const notifier = createNotifier({ store: push.store, sender, log: (e) => db.store.logEvent(e), now: () => NOW })
    const { model } = fakeModel([
      { toolCalls: [call("request_human_handoff", { reason: "Customer asked for a person." })] },
      { content: "Baik, tim FSI akan membalas di sini." },
    ])

    expect(await answerInbound(pending, { ...deps(db, model), notifier })).toBe("sent")
    expect(sent).toEqual([
      expect.objectContaining({
        endpoint: "https://push.example.test/phone",
        payload: expect.objectContaining({ url: `/inbox/${db.conversations[0].id}` }),
      }),
    ])
  })

  it("a failing notification never blocks the handoff", async () => {
    const db = createMemoryStore()
    const pending = await receive(db, "Saya mau bicara dengan orang.")
    const push = memoryPushStore({ targets: [device("phone", "admin-1")], adminIds: ["admin-1"] })
    const { sender } = fakeSender({ "https://push.example.test/phone": { ok: false, statusCode: 500, message: "down" } })
    const notifier = createNotifier({ store: push.store, sender, log: (e) => db.store.logEvent(e), now: () => NOW })
    const { model } = fakeModel([
      { toolCalls: [call("request_human_handoff", { reason: "Customer asked for a person." })] },
      { content: "Baik, tim FSI akan membalas di sini." },
    ])
    const { api, sent } = fakeApi()

    expect(await answerInbound(pending, { ...deps(db, model, api), notifier })).toBe("sent")
    expect(db.conversations[0].mode).toBe("human")
    expect(sent).toHaveLength(1)
    expect(db.events.map((e) => e.type)).toEqual(expect.arrayContaining(["handoff_requested", "push_failed"]))
  })
})

