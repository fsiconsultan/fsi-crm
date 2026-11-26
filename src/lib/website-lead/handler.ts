import { createHmac, timingSafeEqual } from "node:crypto"
import type { Json } from "@/lib/supabase/database.types"
import { costLabel, installationLabel, phaseLabel, siteLabel } from "./labels"
import { parseWebsiteLead, type QuoteDetails, type WebsiteLead } from "./payload"
import type { WebsiteLeadStore } from "./store"

// Vercel refuses request bodies over 4.5 MB before the route runs, so the caps
// sit just under it. The website keeps photos up to 5 MB; a bigger one is not
// sent and the note says where it is.
export const MAX_BODY_BYTES = 4_400_000
export const MAX_JSON_BYTES = 100_000
export const MAX_PHOTO_BYTES = 4_000_000

export const SIGNATURE_HEADER = "x-fsi-signature"

export type WebsiteLeadResult = { status: number; body: Record<string, unknown> }

// "sha256=<hex>" of the exact bytes received, keyed with WEBSITE_LEAD_SECRET.
export function signWebsiteBody(body: Uint8Array | string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

export function verifyWebsiteSignature(body: Uint8Array, header: string | null, secret: string | undefined) {
  if (!secret || !header) return false
  const expected = Buffer.from(signWebsiteBody(body, secret))
  const received = Buffer.from(header.trim())
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function handleWebsiteLead(input: {
  body: Uint8Array
  contentType: string | null
  signature: string | null
  secret: string | undefined
  store: WebsiteLeadStore | null
  now: Date
}): Promise<WebsiteLeadResult> {
  const { body, contentType, signature, secret, store, now } = input

  if (body.byteLength > MAX_BODY_BYTES) return fail(413, "Body too large")
  if (!secret) return fail(503, "Website leads are not configured")
  if (!verifyWebsiteSignature(body, signature, secret)) return fail(401, "Invalid signature")
  if (!store) return fail(503, "Database is not configured")

  const read = await readBody(body, contentType ?? "")
  if (!read.ok) return fail(400, read.error)

  const parsed = parseWebsiteLead(read.payload)
  if (!parsed.ok) return fail(400, parsed.error)
  const lead = parsed.lead

  // A photo is only kept for a quote, and only when it really is an image.
  let photo: { bytes: Uint8Array; mimeType: string; extension: string } | null = null
  let photoIssue: "too_large" | "not_an_image" | null = lead.photoSkipped
  if (lead.form === "quote" && read.photo) {
    if (read.photo.byteLength > MAX_PHOTO_BYTES) photoIssue = "too_large"
    else {
      const kind = imageKind(read.photo)
      if (kind) photo = { bytes: read.photo, ...kind }
      else photoIssue = "not_an_image"
    }
  }

  const submittedAt = now.toISOString()
  let result
  try {
    result = await store.ingest({
      submissionId: lead.submissionId,
      form: lead.form,
      source: lead.form === "quote" ? "website_quote" : "website_chat",
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      location: lead.quote ? (lead.quote.address ?? lead.quote.maps_link) : null,
      note: buildNote(lead, now, photoIssue),
      quoteDetails: lead.quote ? (quoteDetails(lead, submittedAt) as unknown as Json) : null,
    })
  } catch (error) {
    console.error("[website-lead] could not save the lead:", error instanceof Error ? error.message : error)
    return fail(500, "Could not save the lead")
  }

  let photoStatus: "saved" | "skipped" | "failed" | "none" = photoIssue ? "skipped" : "none"
  if (photo && result.photoPath) photoStatus = "saved"
  else if (photo) {
    try {
      await store.saveMeterPhoto({ leadId: result.leadId, submissionId: lead.submissionId, ...photo })
      photoStatus = "saved"
    } catch (error) {
      // The lead itself is saved. The website logs the status; the photo stays on its server.
      console.error(`[website-lead] lead ${result.leadId}: meter photo not saved:`, error instanceof Error ? error.message : error)
      photoStatus = "failed"
    }
  }

  return {
    status: 200,
    body: { ok: true, lead_id: result.leadId, created: result.created, replayed: result.replayed, photo: photoStatus },
  }
}

function fail(status: number, error: string): WebsiteLeadResult {
  return { status, body: { ok: false, error } }
}

type Read = { ok: true; payload: unknown; photo: Uint8Array | null } | { ok: false; error: string }

// JSON for a chat or a quote without a photo; multipart with a "payload" JSON
// field and an optional "photo" file otherwise. Read only after the signature
// check, so unsigned bodies are never parsed.
async function readBody(body: Uint8Array, contentType: string): Promise<Read> {
  if (contentType.toLowerCase().startsWith("multipart/form-data")) {
    let form: FormData
    try {
      form = await new Response(body as BodyInit, { headers: { "content-type": contentType } }).formData()
    } catch {
      return { ok: false, error: "Malformed multipart body" }
    }
    const payload = form.get("payload")
    if (typeof payload !== "string") return { ok: false, error: "payload field is missing" }
    const json = parseJson(payload)
    if (!json.ok) return json
    const file = form.get("photo")
    const photo = file instanceof Blob && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null
    return { ok: true, payload: json.value, photo }
  }

  if (body.byteLength > MAX_JSON_BYTES) return { ok: false, error: "JSON body too large" }
  const json = parseJson(new TextDecoder().decode(body))
  return json.ok ? { ok: true, payload: json.value, photo: null } : json
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw.length > MAX_JSON_BYTES) return { ok: false, error: "JSON body too large" }
  try {
    return { ok: true, value: JSON.parse(raw) }
  } catch {
    return { ok: false, error: "Body is not valid JSON" }
  }
}

// The file's own bytes decide the type, never a name or a header.
export function imageKind(bytes: Uint8Array): { mimeType: string; extension: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mimeType: "image/jpeg", extension: "jpg" }
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { mimeType: "image/png", extension: "png" }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mimeType: "image/webp", extension: "webp" }
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12)
    if (["heic", "heix", "heim", "heis"].includes(brand)) return { mimeType: "image/heic", extension: "heic" }
    if (["mif1", "msf1", "heif"].includes(brand)) return { mimeType: "image/heif", extension: "heif" }
  }
  return null
}

function quoteDetails(lead: WebsiteLead, submittedAt: string): QuoteDetails {
  return { ...lead.quote!, language: lead.language, message: lead.message, submitted_at: submittedAt }
}

// Asia/Makassar (WITA), the time zone the website and staff use.
export function witaStamp(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} WITA`
}

// The dated note appended to the lead. Short lines staff can read on a phone.
export function buildNote(lead: WebsiteLead, now: Date, photoIssue: "too_large" | "not_an_image" | null) {
  const lines = [`${witaStamp(now)}: ${lead.form === "quote" ? "Quote request" : "Chat message"} from the website`]
  const q = lead.quote
  if (q) {
    lines.push(
      `Site: ${siteLabel(q.site_type, q.site_type_other)}`,
      `Installation: ${installationLabel(q.installation_type)}`,
      `Monthly cost: ${costLabel(q.monthly_cost, q.monthly_cost_unit)}`,
      `Reduction: ${q.reduction_percent}% less`,
      `PLN meter: ${phaseLabel(q.meter_phase)}`,
    )
    if (q.address) lines.push(`Address: ${q.address}`)
    if (q.maps_link) lines.push(`Map: ${q.maps_link}`)
  }
  if (lead.message) lines.push(`Message: ${lead.message}`)
  if (photoIssue === "too_large") lines.push("Meter photo: too large for the CRM. It is kept on the website server.")
  if (photoIssue === "not_an_image") lines.push("Meter photo: the file sent was not an image, so it was not kept.")
  return lines.join("\n")
}
