// One device that agreed to receive notifications (a row of push_subscriptions).
export type PushTarget = {
  id: string
  salesUserId: string
  endpoint: string
  p256dh: string
  auth: string
}

// What the service worker (public/sw.js) shows. Keep it short: a lock screen is
// public, so it carries a name and a reason, never the conversation itself.
export type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

export type SendOutcome = { ok: true } | { ok: false; statusCode: number | null; message: string }

export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<SendOutcome>
}

export interface PushStore {
  subscriptionsFor(salesUserIds: string[]): Promise<PushTarget[]>
  activeAdminIds(): Promise<string[]>
  markSuccess(id: string, at: string): Promise<void>
  recordFailure(id: string): Promise<void>
  remove(id: string): Promise<void>
}
