import type { PushPayload, PushSender, PushStore, PushTarget, SendOutcome } from "../types"

export function memoryPushStore(seed: { targets?: PushTarget[]; adminIds?: string[] } = {}) {
  const targets = [...(seed.targets ?? [])]
  const successes: string[] = []
  const failures: Record<string, number> = {}
  const store: PushStore = {
    async subscriptionsFor(ids) {
      return targets.filter((t) => ids.includes(t.salesUserId))
    },
    async activeAdminIds() {
      return seed.adminIds ?? []
    },
    async markSuccess(id) {
      successes.push(id)
    },
    async recordFailure(id) {
      failures[id] = (failures[id] ?? 0) + 1
    },
    async remove(id) {
      const i = targets.findIndex((t) => t.id === id)
      if (i >= 0) targets.splice(i, 1)
    },
  }
  return { store, targets, successes, failures }
}

// A fake web-push: answers per endpoint, records what was sent.
export function fakeSender(outcomes: Record<string, SendOutcome> = {}) {
  const sent: Array<{ endpoint: string; payload: PushPayload }> = []
  const sender: PushSender = {
    async send(target, payload) {
      sent.push({ endpoint: target.endpoint, payload })
      return outcomes[target.endpoint] ?? { ok: true }
    },
  }
  return { sender, sent }
}

export function device(id: string, salesUserId: string): PushTarget {
  return { id, salesUserId, endpoint: `https://push.example.test/${id}`, p256dh: "key", auth: "auth" }
}
