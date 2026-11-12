// The parts of Meta's webhook payload this app reads. Everything is optional
// because Meta adds fields and message types over time, and an unknown shape
// must never crash the webhook.

type RawMessage = {
  from?: string
  id?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string }
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
  image?: { caption?: string }
  video?: { caption?: string }
  document?: { caption?: string }
}

type RawStatus = {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>
}

type RawValue = {
  metadata?: { phone_number_id?: string }
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
  messages?: RawMessage[]
  statuses?: RawStatus[]
}

export type WebhookPayload = {
  object?: string
  entry?: Array<{ changes?: Array<{ field?: string; value?: RawValue }> }>
}

export type InboundMessage = {
  kind: "message"
  waMessageId: string
  from: string
  profileName: string | null
  phoneNumberId: string | null
  // "text" for anything that carries words (text, button and list replies);
  // otherwise Meta's own type name (image, audio, location, ...).
  messageType: string
  body: string | null
  timestamp: string | null
}

export type StatusUpdate = {
  kind: "status"
  waMessageId: string
  status: "sent" | "delivered" | "read" | "failed"
  errorCode: string | null
  errorMessage: string | null
}

export type WebhookEvent = InboundMessage | StatusUpdate

const STATUSES = ["sent", "delivered", "read", "failed"] as const

function toIso(seconds: string | undefined) {
  const n = Number(seconds)
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null
}

function readMessage(raw: RawMessage, value: RawValue): InboundMessage | null {
  if (!raw.id || !raw.from) return null

  const words =
    raw.text?.body ??
    raw.button?.text ??
    raw.interactive?.button_reply?.title ??
    raw.interactive?.list_reply?.title ??
    null
  const caption = raw.image?.caption ?? raw.video?.caption ?? raw.document?.caption ?? null
  const contact = value.contacts?.find((c) => c.wa_id === raw.from) ?? value.contacts?.[0]

  return {
    kind: "message",
    waMessageId: raw.id,
    from: raw.from.replace(/\D/g, ""),
    profileName: contact?.profile?.name ?? null,
    phoneNumberId: value.metadata?.phone_number_id ?? null,
    messageType: words !== null ? "text" : (raw.type ?? "unknown"),
    body: words ?? caption,
    timestamp: toIso(raw.timestamp),
  }
}

function readStatus(raw: RawStatus): StatusUpdate | null {
  const status = STATUSES.find((s) => s === raw.status)
  if (!raw.id || !status) return null

  const error = raw.errors?.[0]
  return {
    kind: "status",
    waMessageId: raw.id,
    status,
    errorCode: error?.code !== undefined ? String(error.code) : null,
    errorMessage: error ? (error.error_data?.details ?? error.message ?? error.title ?? null) : null,
  }
}

// Flattens a webhook body into the events we handle. Anything it does not
// recognise is skipped, never thrown on.
export function parseWebhook(payload: unknown): WebhookEvent[] {
  const events: WebhookEvent[] = []
  const body = payload as WebhookPayload | null
  if (!body || typeof body !== "object" || !Array.isArray(body.entry)) return events

  for (const entry of body.entry) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value
      if (!value || typeof value !== "object") continue

      for (const raw of Array.isArray(value.messages) ? value.messages : []) {
        const message = readMessage(raw ?? {}, value)
        if (message) events.push(message)
      }
      for (const raw of Array.isArray(value.statuses) ? value.statuses : []) {
        const status = readStatus(raw ?? {})
        if (status) events.push(status)
      }
    }
  }

  return events
}
