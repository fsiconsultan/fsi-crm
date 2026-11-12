// Small client for the WhatsApp Cloud API (direct to Meta, no BSP). Every send
// returns a typed result; nothing here throws, so callers cannot mistake a
// rejected message for a sent one.

export type SendFailureKind =
  | "not_configured" // no access token or phone number id yet
  | "outside_window" // more than 24h since the customer's last message; a template is required
  | "auth" // token expired or lacks permission
  | "rate_limited"
  | "recipient_unreachable" // not on WhatsApp, blocked us, or not an allowed test number
  | "template" // template missing, paused or wrong parameters
  | "network" // could not reach Meta
  | "unknown"

export type SendResult =
  | { ok: true; waMessageId: string }
  | { ok: false; kind: SendFailureKind; code: string | null; message: string }

export type CloudApi = {
  sendText(to: string, body: string): Promise<SendResult>
  sendTemplate(to: string, name: string, languageCode: string, bodyParams?: string[]): Promise<SendResult>
}

export type CloudApiConfig = {
  accessToken?: string
  phoneNumberId?: string
  graphVersion?: string
  fetch?: typeof fetch
}

const DEFAULT_GRAPH_VERSION = "v23.0"

// Meta error codes: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
export function classifyMetaError(code: number | string | null | undefined, httpStatus?: number): SendFailureKind {
  const n = code === null || code === undefined ? NaN : Number(code)
  if (n === 131047) return "outside_window"
  if (n === 190 || n === 0 || n === 3 || n === 10 || (n >= 200 && n <= 299) || httpStatus === 401) return "auth"
  if ([4, 80007, 130429, 131048, 131056].includes(n) || httpStatus === 429) return "rate_limited"
  if ([131026, 131030, 131021, 131049, 131050].includes(n)) return "recipient_unreachable"
  if (n >= 132000 && n <= 132999) return "template"
  return "unknown"
}

export const FAILURE_TEXT: Record<SendFailureKind, string> = {
  not_configured: "WhatsApp is not connected yet, so nothing was sent.",
  outside_window:
    "The customer last wrote more than 24 hours ago. WhatsApp only accepts an approved template message now.",
  auth: "WhatsApp rejected our access token. The token may have expired.",
  rate_limited: "WhatsApp is limiting how fast we can send. Try again in a few minutes.",
  recipient_unreachable: "WhatsApp could not deliver to this number.",
  template: "WhatsApp rejected the template (missing, paused or wrong parameters).",
  network: "Could not reach WhatsApp. Check the connection and try again.",
  unknown: "WhatsApp rejected the message.",
}

export function createCloudApi(config: CloudApiConfig): CloudApi {
  const { accessToken, phoneNumberId } = config
  const doFetch = config.fetch ?? fetch
  const version = config.graphVersion || DEFAULT_GRAPH_VERSION

  async function send(payload: Record<string, unknown>): Promise<SendResult> {
    if (!accessToken || !phoneNumberId) {
      return { ok: false, kind: "not_configured", code: null, message: FAILURE_TEXT.not_configured }
    }

    let response: Response
    try {
      response = await doFetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
      })
    } catch {
      return { ok: false, kind: "network", code: null, message: FAILURE_TEXT.network }
    }

    let json: {
      messages?: Array<{ id?: string }>
      error?: { code?: number; message?: string; error_data?: { details?: string } }
    } | null = null
    try {
      json = await response.json()
    } catch {
      json = null
    }

    const waMessageId = json?.messages?.[0]?.id
    if (response.ok && waMessageId) return { ok: true, waMessageId }

    const kind = classifyMetaError(json?.error?.code, response.status)
    const detail = json?.error?.error_data?.details ?? json?.error?.message
    return {
      ok: false,
      kind,
      code: json?.error?.code !== undefined ? String(json.error.code) : `http_${response.status}`,
      message: detail ? `${FAILURE_TEXT[kind]} (${detail})` : FAILURE_TEXT[kind],
    }
  }

  return {
    sendText(to, body) {
      return send({ to, type: "text", text: { preview_url: false, body } })
    },
    sendTemplate(to, name, languageCode, bodyParams = []) {
      return send({
        to,
        type: "template",
        template: {
          name,
          language: { code: languageCode },
          ...(bodyParams.length
            ? {
                components: [
                  { type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) },
                ],
              }
            : {}),
        },
      })
    },
  }
}

export function cloudApiFromEnv(): CloudApi {
  return createCloudApi({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION,
  })
}
