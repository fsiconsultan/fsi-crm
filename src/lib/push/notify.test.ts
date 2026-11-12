import { describe, expect, it } from "vitest"
import type { NewEvent } from "@/lib/whatsapp/types"
import { assignmentRecipients, createNotifier, handoffRecipients, type NoticeConversation } from "./notify"
import { device, fakeSender, memoryPushStore } from "./testing/fakes"

const conversation = (assigned: string | null): NoticeConversation => ({
  id: "conv-1",
  wa_id: "6281200000001",
  profile_name: "Budi",
  lead_id: 7,
  assigned_sales_id: assigned,
})

function setup(opts: Parameters<typeof memoryPushStore>[0] = {}, outcomes: Parameters<typeof fakeSender>[0] = {}) {
  const push = memoryPushStore(opts)
  const { sender, sent } = fakeSender(outcomes)
  const events: NewEvent[] = []
  const notifier = createNotifier({
    store: push.store,
    sender,
    log: async (event) => {
      events.push(event)
    },
    now: () => new Date("2026-11-12T03:00:00Z"),
  })
  return { notifier, sent, events, push }
}

describe("recipient selection", () => {
  it("sends a handoff to the assigned salesperson only", () => {
    expect(handoffRecipients({ assignedSalesId: "sales-1", adminIds: ["admin-1"], actorId: null })).toEqual(["sales-1"])
  })

  it("falls back to every Admin when nobody is assigned", () => {
    expect(handoffRecipients({ assignedSalesId: null, adminIds: ["admin-1", "admin-2"], actorId: null })).toEqual([
      "admin-1",
      "admin-2",
    ])
  })

  it("never notifies the person who performed the action", () => {
    expect(handoffRecipients({ assignedSalesId: null, adminIds: ["admin-1", "admin-2"], actorId: "admin-1" })).toEqual([
      "admin-2",
    ])
    expect(assignmentRecipients({ toSalesId: "admin-1", actorId: "admin-1" })).toEqual([])
    expect(assignmentRecipients({ toSalesId: "sales-1", actorId: "admin-1" })).toEqual(["sales-1"])
  })
})

describe("notifier", () => {
  it("notifies every device of the assigned salesperson with a short, linked message", async () => {
    const { notifier, sent, push } = setup({
      targets: [device("phone", "sales-1"), device("laptop", "sales-1"), device("other", "sales-2")],
    })

    const result = await notifier.handoff(conversation("sales-1"))

    expect(result).toEqual({ recipients: 1, devices: 2, delivered: 2 })
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example.test/phone", "https://push.example.test/laptop"])
    expect(sent[0].payload).toEqual({
      title: "Budi",
      body: "Customer asked for a person",
      url: "/inbox/conv-1",
      tag: "conversation-conv-1",
    })
    expect(push.successes).toEqual(["phone", "laptop"])
  })

  it("sends an unassigned handoff to the Admins", async () => {
    const { notifier, sent } = setup({ targets: [device("a1", "admin-1"), device("s1", "sales-1")], adminIds: ["admin-1"] })
    await notifier.handoff(conversation(null))
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example.test/a1"])
  })

  it("uses the number when there is no profile name, and never puts the AI's reason on the lock screen", async () => {
    const { notifier, sent } = setup({ targets: [device("phone", "sales-1")] })
    await notifier.handoff({ ...conversation("sales-1"), profile_name: null })
    expect(sent[0].payload.title).toBe("+62 812 0000 0001")
    expect(sent[0].payload.body).toBe("Customer asked for a person")
  })

  it("sends a handoff to the Admins when the assignee is inactive", async () => {
    const { notifier, sent } = setup({
      targets: [device("s1", "sales-1"), device("a1", "admin-1")],
      adminIds: ["admin-1"],
      inactive: ["sales-1"],
    })
    await notifier.handoff(conversation("sales-1"))
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example.test/a1"])
  })

  it("never notifies deactivated staff", async () => {
    const { notifier, sent } = setup({ targets: [device("phone", "sales-1")], inactive: ["sales-1"] })
    expect(await notifier.handoff(conversation("sales-1"))).toMatchObject({ devices: 0, delivered: 0 })
    expect(sent).toEqual([])
  })

  it("sends to every device at once, so one hung device does not hold up the others", async () => {
    const push = memoryPushStore({ targets: [device("slow", "sales-1"), device("fast", "sales-1")] })
    const started: string[] = []
    let release: () => void = () => {}
    const sender = {
      async send(target: { id: string }) {
        started.push(target.id)
        if (target.id === "slow") await new Promise<void>((r) => (release = r))
        return { ok: true as const }
      },
    }
    const notifier = createNotifier({ store: push.store, sender, log: async () => {}, now: () => new Date() })
    const run = notifier.handoff(conversation("sales-1"))
    await new Promise((r) => setTimeout(r, 0))
    expect(started).toEqual(["slow", "fast"])
    release()
    expect(await run).toMatchObject({ delivered: 2 })
  })

  it("treats a sender that throws as a failed device, not a crash", async () => {
    const push = memoryPushStore({ targets: [device("phone", "sales-1")] })
    const events: NewEvent[] = []
    const sender = {
      async send(): Promise<never> {
        throw new Error("socket hang up")
      },
    }
    const notifier = createNotifier({ store: push.store, sender, log: async (e) => void events.push(e), now: () => new Date() })
    await expect(notifier.handoff(conversation("sales-1"))).resolves.toMatchObject({ delivered: 0 })
    expect(events[0]).toMatchObject({ type: "push_failed", needsReview: true })
  })

  it("tells a salesperson a conversation was assigned to them, but not the Admin who assigned it", async () => {
    const { notifier, sent } = setup({ targets: [device("s1", "sales-1"), device("a1", "admin-1")] })
    await notifier.assigned(conversation("sales-1"), "sales-1", "admin-1")
    await notifier.assigned(conversation("admin-1"), "admin-1", "admin-1")
    expect(sent).toEqual([
      expect.objectContaining({
        endpoint: "https://push.example.test/s1",
        payload: expect.objectContaining({ body: "Assigned to you", url: "/inbox/conv-1" }),
      }),
    ])
  })

  it("removes devices the push service reports as gone (404, 410) without logging them as failures", async () => {
    const { notifier, push, events } = setup(
      { targets: [device("gone", "sales-1"), device("expired", "sales-1"), device("ok", "sales-1")] },
      {
        "https://push.example.test/gone": { ok: false, statusCode: 410, message: "Gone" },
        "https://push.example.test/expired": { ok: false, statusCode: 404, message: "Not found" },
      },
    )
    const result = await notifier.handoff(conversation("sales-1"))
    expect(push.targets.map((t) => t.id)).toEqual(["ok"])
    expect(result.delivered).toBe(1)
    expect(events).toEqual([])
  })

  it("logs other failures, counts them on the device, and flags review when nobody was reached", async () => {
    const { notifier, push, events } = setup(
      { targets: [device("phone", "sales-1")] },
      { "https://push.example.test/phone": { ok: false, statusCode: 500, message: "Push service error" } },
    )
    const result = await notifier.handoff(conversation("sales-1"))
    expect(result.delivered).toBe(0)
    expect(push.failures).toEqual({ phone: 1 })
    expect(push.targets).toHaveLength(1)
    expect(events).toEqual([
      expect.objectContaining({ type: "push_failed", needsReview: true, conversationId: "conv-1", leadId: 7 }),
    ])
  })

  it("keeps a device that timed out or got a 5xx; only 404 and 410 remove it", async () => {
    const { notifier, push } = setup(
      { targets: [device("timeout", "sales-1"), device("server", "sales-1")] },
      {
        "https://push.example.test/timeout": { ok: false, statusCode: null, message: "Socket timeout" },
        "https://push.example.test/server": { ok: false, statusCode: 503, message: "Unavailable" },
      },
    )
    await notifier.handoff(conversation("sales-1"))
    expect(push.targets.map((t) => t.id)).toEqual(["timeout", "server"])
    expect(push.failures).toEqual({ timeout: 1, server: 1 })
  })

  it("logs a failed record update without affecting delivery", async () => {
    const { notifier, push, events } = setup({ targets: [device("phone", "sales-1")] })
    push.store.markSuccess = async () => {
      throw new Error("Mark device delivered: connection reset")
    }
    expect(await notifier.handoff(conversation("sales-1"))).toMatchObject({ delivered: 1 })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: "push_failed", severity: "warning" })
    expect(events[0].needsReview).toBeFalsy()
    expect(events[0].summary).toContain("connection reset")
  })

  it("never throws when the subscription store is down; it logs instead", async () => {
    const { notifier, events, push } = setup({ targets: [device("phone", "sales-1")] })
    push.store.subscriptionsFor = async () => {
      throw new Error("database is down")
    }
    await expect(notifier.handoff(conversation("sales-1"))).resolves.toMatchObject({ delivered: 0 })
    expect(events[0]).toMatchObject({ type: "push_failed", needsReview: true })
    expect(events[0].summary).toContain("database is down")
  })

  it("does nothing, and logs nothing, when the recipient has no devices", async () => {
    const { notifier, sent, events } = setup()
    expect(await notifier.handoff(conversation("sales-1"))).toEqual({ recipients: 1, devices: 0, delivered: 0 })
    expect(sent).toEqual([])
    expect(events).toEqual([])
  })
})
