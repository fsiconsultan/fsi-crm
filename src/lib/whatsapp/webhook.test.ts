import { describe, expect, it } from "vitest"
import statuses from "./testing/fixtures/statuses.json"
import textMessage from "./testing/fixtures/text-message.json"
import unknownTypes from "./testing/fixtures/unknown-types.json"
import { createMemoryStore } from "./testing/memory-store"
import { parseWebhook } from "./payload"
import { signBody } from "./signature"
import { handleDelivery, handleVerification } from "./webhook"

const SECRET = "test-app-secret"
const NOW = new Date("2026-11-12T03:00:00Z")

function deliver(
  store: ReturnType<typeof createMemoryStore>["store"] | null,
  payload: unknown,
  signature?: string,
  phoneNumberId?: string,
) {
  const rawBody = JSON.stringify(payload)
  return handleDelivery({
    rawBody,
    signature: signature ?? signBody(rawBody, SECRET),
    appSecret: SECRET,
    store,
    now: NOW,
    phoneNumberId,
  })
}

describe("GET verification", () => {
  const params = (token: string) =>
    new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "1158201444" })

  it("echoes the challenge when the verify token matches", () => {
    expect(handleVerification(params("the-token"), "the-token")).toEqual({ status: 200, body: "1158201444" })
  })

  it("refuses a wrong token, and any token when none is configured", () => {
    expect(handleVerification(params("wrong"), "the-token").status).toBe(403)
    expect(handleVerification(params(""), undefined).status).toBe(403)
    expect(handleVerification(params(""), "").status).toBe(403)
  })
})

describe("POST delivery", () => {
  it("rejects a delivery with a bad signature and stores nothing", async () => {
    const db = createMemoryStore()
    const result = await deliver(db.store, textMessage, "sha256=" + "0".repeat(64))
    expect(result.status).toBe(401)
    expect(db.messages).toHaveLength(0)
    expect(db.conversations).toHaveLength(0)
  })

  it("stores an inbound text message and queues it for a reply", async () => {
    const db = createMemoryStore()
    const result = await deliver(db.store, textMessage)

    expect(result.status).toBe(200)
    expect(db.conversations).toHaveLength(1)
    expect(db.conversations[0]).toMatchObject({
      wa_id: "6281200000001",
      profile_name: "Test Customer",
      mode: "bot",
      source: "whatsapp",
      lead_id: null,
    })
    expect(db.conversations[0].last_inbound_at).toBe("2026-11-12T00:40:00.000Z")
    expect(db.messages).toHaveLength(1)
    expect(db.messages[0]).toMatchObject({
      direction: "inbound",
      sender_type: "customer",
      wa_message_id: "wamid.TEST_INBOUND_0001",
      status: "received",
      body: "Halo, saya mau tanya soal panel surya untuk villa saya.",
    })
    expect(result.pending).toEqual([
      { conversationId: db.conversations[0].id, messageId: db.messages[0].id, assignedTo: null },
    ])
  })

  it("is idempotent on Meta's message id: a retried delivery stores nothing new", async () => {
    const db = createMemoryStore()
    const first = await deliver(db.store, textMessage)
    const retry = await deliver(db.store, textMessage)

    expect(retry.status).toBe(200)
    expect(db.messages).toHaveLength(1)
    expect(db.conversations).toHaveLength(1)
    // Not answered yet, so the retry queues the same message again (the AI run
    // is claimed per conversation, so it is never answered twice).
    expect(retry.pending).toEqual([{ ...first.pending[0], assignedTo: null }])
  })

  it("queues nothing on a retry once the message has been answered", async () => {
    const db = createMemoryStore()
    await deliver(db.store, textMessage)
    await db.store.insertMessage({
      conversationId: db.conversations[0].id,
      direction: "outbound",
      senderType: "bot",
      body: "Halo!",
      waMessageId: "wamid.BOT_1",
      status: "sent",
    })
    expect((await deliver(db.store, textMessage)).pending).toEqual([])
  })

  it("finishes the conversation update on a retry when the first attempt failed half-way", async () => {
    const db = createMemoryStore()
    const update = db.store.updateConversation
    db.store.updateConversation = async () => {
      throw new Error("database is down")
    }
    expect((await deliver(db.store, textMessage)).status).toBe(500)
    expect(db.conversations[0].last_inbound_at).toBeNull()

    db.store.updateConversation = update
    const retry = await deliver(db.store, textMessage)
    expect(retry.status).toBe(200)
    expect(db.conversations[0].last_inbound_at).not.toBeNull()
    expect(retry.pending).toHaveLength(1)
  })

  it("never moves last_inbound_at or the preview backwards for a late, older message", async () => {
    const db = createMemoryStore()
    await deliver(db.store, textMessage)
    const newer = db.conversations[0].last_inbound_at
    const late = structuredClone(textMessage)
    const message = late.entry[0].changes[0].value.messages[0]
    message.id = "wamid.LATE_OLDER"
    message.timestamp = String(Number(message.timestamp) - 3600)
    message.text.body = "older message"
    await deliver(db.store, late)
    expect(db.conversations[0].last_inbound_at).toBe(newer)
    expect(db.conversations[0].last_message_preview).not.toBe("older message")
  })

  it("marks the conversation as waiting for the AI when a message arrives in bot mode", async () => {
    const db = createMemoryStore()
    await deliver(db.store, textMessage)
    expect(db.conversations[0].ai_pending_since).toBe(NOW.toISOString())
  })

  it("links the conversation to the one lead with that number and assigns its owner", async () => {
    const db = createMemoryStore({
      leads: [{ id: 7, customer_name: "Existing", phone: "0812-0000-0001", phone_wa: "6281200000001", status: "Quotation", sales_id: "sales-1" }],
    })
    await deliver(db.store, textMessage)

    expect(db.conversations[0]).toMatchObject({ lead_id: 7, assigned_sales_id: "sales-1" })
    expect(db.assignments).toEqual([
      expect.objectContaining({ toSalesId: "sales-1", rule: "lead_owner", assignedBy: null, leadId: 7 }),
    ])
    expect(db.leads[0].status).toBe("Quotation")
  })

  it("links a foreign customer's WhatsApp number to their lead (no duplicate)", async () => {
    const payload = structuredClone(textMessage)
    const value = payload.entry[0].changes[0].value
    value.contacts[0].wa_id = "8613800138000"
    value.messages[0].from = "8613800138000"
    const db = createMemoryStore({
      leads: [{ id: 9, customer_name: "Li", phone: "+86 138 0013 8000", phone_wa: "8613800138000", status: null, sales_id: "sales-1" }],
    })
    await deliver(db.store, payload)
    expect(db.conversations[0]).toMatchObject({ lead_id: 9, assigned_sales_id: "sales-1" })
  })

  it("leaves a chat unassigned when the lead's salesperson is inactive", async () => {
    const db = createMemoryStore({
      leads: [{ id: 7, customer_name: "Existing", phone: "0812-0000-0001", phone_wa: "6281200000001", status: null, sales_id: "sales-1" }],
      inactiveSales: ["sales-1"],
    })
    const result = await deliver(db.store, textMessage)
    expect(db.conversations[0]).toMatchObject({ lead_id: 7, assigned_sales_id: null })
    expect(result.pending[0].assignedTo).toBeNull()
    expect(db.assignments).toEqual([])
  })

  it("tells the route who a first message was assigned to, so they can be notified", async () => {
    const db = createMemoryStore({
      leads: [{ id: 7, customer_name: "Existing", phone: "0812-0000-0001", phone_wa: "6281200000001", status: null, sales_id: "sales-1" }],
    })
    const first = await deliver(db.store, textMessage)
    expect(first.pending[0].assignedTo).toBe("sales-1")
  })

  it("logs an ambiguous match for review instead of picking one of the duplicate leads", async () => {
    const db = createMemoryStore({
      leads: [
        { id: 7, customer_name: "A", phone: "0812-0000-0001", phone_wa: "6281200000001", status: null, sales_id: "sales-1" },
        { id: 8, customer_name: "B", phone: "812 0000 0001", phone_wa: "6281200000001", status: null, sales_id: "sales-2" },
      ],
    })
    await deliver(db.store, textMessage)

    expect(db.conversations[0]).toMatchObject({ lead_id: null, assigned_sales_id: null })
    expect(db.events).toEqual([
      expect.objectContaining({ type: "lead_match_ambiguous", needs_review: true, detail: { lead_ids: [7, 8] } }),
    ])
  })

  it("never throws on unknown message types or malformed entries", async () => {
    const db = createMemoryStore()
    const result = await deliver(db.store, unknownTypes)

    expect(result.status).toBe(200)
    expect(db.messages.map((m) => m.message_type)).toEqual(["image", "reaction", "a_type_meta_adds_next_year"])
    expect(db.messages.every((m) => m.body === null)).toBe(true)
    expect(db.events.filter((e) => e.type === "unsupported_message")).toHaveLength(3)
  })

  it.each([[{}], [[]], ["text"], [null], [{ entry: "nope" }], [{ entry: [{ changes: [{ value: 5 }] }] }]])(
    "acknowledges a signed payload it does not understand: %j",
    async (payload) => {
      expect(parseWebhook(payload)).toEqual([])
      expect((await deliver(createMemoryStore().store, payload)).status).toBe(200)
    },
  )

  it("acknowledges signed non-JSON instead of asking Meta to retry it forever", async () => {
    const result = await handleDelivery({
      rawBody: "not json",
      signature: signBody("not json", SECRET),
      appSecret: SECRET,
      store: createMemoryStore().store,
      now: NOW,
    })
    expect(result.status).toBe(200)
  })

  it("does not acknowledge when there is nowhere to store the message", async () => {
    expect((await deliver(null, textMessage)).status).toBe(503)
  })

  it("answers 500 so Meta retries when the database fails", async () => {
    const db = createMemoryStore()
    db.store.insertMessage = async () => {
      throw new Error("database is down")
    }
    expect((await deliver(db.store, textMessage)).status).toBe(500)
  })
})

describe("status updates", () => {
  async function withOutbound() {
    const db = createMemoryStore()
    await deliver(db.store, textMessage)
    const conversationId = db.conversations[0].id
    for (const waMessageId of ["wamid.TEST_OUTBOUND_OK", "wamid.TEST_OUTBOUND_LATE"]) {
      await db.store.insertMessage({
        conversationId,
        direction: "outbound",
        senderType: "bot",
        body: "Halo!",
        waMessageId,
        status: "sent",
      })
    }
    return db
  }

  it("records delivery, and records a late failure with its reason and logs it for review", async () => {
    const db = await withOutbound()
    const result = await deliver(db.store, statuses)
    expect(result).toMatchObject({ status: 200, pending: [] })

    const ok = db.messages.find((m) => m.wa_message_id === "wamid.TEST_OUTBOUND_OK")
    const late = db.messages.find((m) => m.wa_message_id === "wamid.TEST_OUTBOUND_LATE")
    expect(ok?.status).toBe("delivered")
    expect(late).toMatchObject({ status: "failed", error_code: "131047" })
    expect(late?.error_message).toContain("24 hours")
    expect(db.events).toContainEqual(
      expect.objectContaining({
        type: "send_failed",
        needs_review: true,
        severity: "error",
        detail: expect.objectContaining({ kind: "outside_window" }),
      }),
    )
  })

  it("does not move a status backwards or log the same failure twice", async () => {
    const db = await withOutbound()
    await db.store.updateMessageStatus("wamid.TEST_OUTBOUND_OK", { status: "read" })
    await deliver(db.store, statuses)
    await deliver(db.store, statuses)

    expect(db.messages.find((m) => m.wa_message_id === "wamid.TEST_OUTBOUND_OK")?.status).toBe("read")
    expect(db.events.filter((e) => e.type === "send_failed")).toHaveLength(1)
  })

  it("ignores statuses for messages this app did not send", async () => {
    const db = createMemoryStore()
    expect((await deliver(db.store, statuses)).status).toBe(200)
    expect(db.events).toHaveLength(0)
  })
})

describe("which webhook changes are read", () => {
  it("skips and logs a delivery for another phone number on the same Meta app", async () => {
    const db = createMemoryStore()
    const result = await deliver(db.store, textMessage, undefined, "OUR_NUMBER_ID")
    expect(result.pending).toEqual([])
    expect(db.messages).toHaveLength(0)
    expect(db.events).toEqual([
      expect.objectContaining({ type: "webhook_error", detail: { phone_number_ids: ["PHONE_NUMBER_ID_PLACEHOLDER"] } }),
    ])
  })

  it("reads a delivery for our own phone number", async () => {
    const db = createMemoryStore()
    await deliver(db.store, textMessage, undefined, "PHONE_NUMBER_ID_PLACEHOLDER")
    expect(db.messages).toHaveLength(1)
  })

  it("reads only 'messages' changes of a WhatsApp Business account", () => {
    const otherField = structuredClone(textMessage)
    otherField.entry[0].changes[0].field = "message_template_status_update"
    expect(parseWebhook(otherField)).toEqual([])

    const otherObject = { ...structuredClone(textMessage), object: "page" }
    expect(parseWebhook(otherObject)).toEqual([])
  })
})

describe("delivery updates that arrive before the send is recorded", () => {
  it("holds an update for an unknown message id instead of dropping it", async () => {
    const db = createMemoryStore()
    await deliver(db.store, statuses)
    expect(db.held.map((h) => h.waMessageId)).toEqual(["wamid.TEST_OUTBOUND_OK", "wamid.TEST_OUTBOUND_LATE"])
  })
})

