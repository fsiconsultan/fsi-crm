import { describe, expect, it } from "vitest"
import { buildNote, handleWebsiteLead, imageKind, MAX_BODY_BYTES, MAX_PHOTO_BYTES, signWebsiteBody, verifyWebsiteSignature, witaStamp } from "./handler"
import { parseWebsiteLead } from "./payload"
import type { IngestInput, MeterPhoto, WebsiteLeadStore } from "./store"

const SECRET = "test-website-secret"
const NOW = new Date("2026-11-26T06:03:00Z") // 14:03 in Bali (WITA)
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])

const quote = {
  submission_id: "q_0123456789abcdef",
  form: "quote",
  language: "en",
  first_name: "Test",
  last_name: "Visitor",
  phone: "0812 3456 7890",
  email: "test@example.com",
  message: "Please call after 5pm",
  quote: {
    site_type: "villa",
    installation_type: "hybrid",
    monthly_cost: 2500000,
    monthly_cost_unit: "Rp",
    reduction_percent: 60,
    meter_phase: "3",
    latitude: -8.65,
    longitude: 115.2167,
    address: "Jl. Test 1, Canggu",
  },
}

const chat = {
  submission_id: "c_0123456789abcdef",
  form: "chat",
  language: "id",
  first_name: "Chat",
  last_name: "",
  phone: "+62 813 0000 1111",
  email: "chat@example.com",
  message: "Halo, berapa harga panel?",
}

// In-memory stand-in for public.ingest_website_lead: the real matching is
// covered against a local database (docs/website-leads.md, "Testing").
function memoryStore(options: { failIngest?: boolean; failPhoto?: boolean } = {}) {
  const ingested: IngestInput[] = []
  const photos: MeterPhoto[] = []
  const seen = new Map<string, { leadId: number; photoPath: string | null }>()
  const store: WebsiteLeadStore = {
    async ingest(input) {
      if (options.failIngest) throw new Error("database down")
      const before = seen.get(input.submissionId)
      if (before) return { leadId: before.leadId, created: false, replayed: true, photoPath: before.photoPath, otherMatches: [] }
      ingested.push(input)
      const leadId = 100 + ingested.length
      seen.set(input.submissionId, { leadId, photoPath: null })
      return { leadId, created: true, replayed: false, photoPath: null, otherMatches: [] }
    },
    async saveMeterPhoto(photo) {
      if (options.failPhoto) throw new Error("storage down")
      photos.push(photo)
      const path = `${photo.leadId}/meter-photo-${photo.submissionId}.${photo.extension}`
      seen.set(photo.submissionId, { leadId: photo.leadId, photoPath: path })
      return path
    },
  }
  return { store, ingested, photos }
}

function json(payload: unknown, store: WebsiteLeadStore | null, signature?: string) {
  const body = new TextEncoder().encode(JSON.stringify(payload))
  return handleWebsiteLead({
    body,
    contentType: "application/json",
    signature: signature ?? signWebsiteBody(body, SECRET),
    secret: SECRET,
    store,
    now: NOW,
  })
}

async function multipart(payload: unknown, photo: Uint8Array | null, store: WebsiteLeadStore) {
  const form = new FormData()
  form.set("payload", JSON.stringify(payload))
  if (photo) form.set("photo", new Blob([photo as BlobPart]), "meter.jpg")
  const request = new Request("http://test", { method: "POST", body: form })
  const body = new Uint8Array(await request.arrayBuffer())
  return handleWebsiteLead({
    body,
    contentType: request.headers.get("content-type"),
    signature: signWebsiteBody(body, SECRET),
    secret: SECRET,
    store,
    now: NOW,
  })
}

describe("signature", () => {
  it("accepts the exact body and refuses any change, a missing header or a missing secret", () => {
    const body = new TextEncoder().encode('{"a":1}')
    const header = signWebsiteBody(body, SECRET)
    expect(verifyWebsiteSignature(body, header, SECRET)).toBe(true)
    expect(verifyWebsiteSignature(new TextEncoder().encode('{"a":2}'), header, SECRET)).toBe(false)
    expect(verifyWebsiteSignature(body, header, "other-secret")).toBe(false)
    expect(verifyWebsiteSignature(body, null, SECRET)).toBe(false)
    expect(verifyWebsiteSignature(body, header, undefined)).toBe(false)
    expect(verifyWebsiteSignature(body, "sha256=short", SECRET)).toBe(false)
  })
})

describe("POST /api/webhooks/website-lead", () => {
  it("refuses a bad signature and writes nothing", async () => {
    const db = memoryStore()
    const result = await json(quote, db.store, "sha256=" + "0".repeat(64))
    expect(result.status).toBe(401)
    expect(db.ingested).toHaveLength(0)
  })

  it("answers 503 when the secret or the database is not configured", async () => {
    const body = new TextEncoder().encode(JSON.stringify(chat))
    const noSecret = await handleWebsiteLead({ body, contentType: "application/json", signature: signWebsiteBody(body, SECRET), secret: undefined, store: memoryStore().store, now: NOW })
    expect(noSecret.status).toBe(503)
    expect((await json(chat, null)).status).toBe(503)
  })

  it("refuses an oversized body before checking anything else", async () => {
    const result = await handleWebsiteLead({ body: new Uint8Array(MAX_BODY_BYTES + 1), contentType: "application/json", signature: null, secret: SECRET, store: memoryStore().store, now: NOW })
    expect(result.status).toBe(413)
  })

  it("refuses a signed but invalid payload with 400", async () => {
    const db = memoryStore()
    const result = await json({ ...quote, quote: { ...quote.quote, meter_phase: "2" } }, db.store)
    expect(result.status).toBe(400)
    expect(result.body.error).toBe("meter_phase is invalid")
    expect(db.ingested).toHaveLength(0)
  })

  it("files a quote with its structured details and a dated note", async () => {
    const db = memoryStore()
    const result = await json(quote, db.store)
    expect(result).toEqual({ status: 200, body: { ok: true, lead_id: 101, created: true, replayed: false, photo: "none" } })
    const [input] = db.ingested
    expect(input).toMatchObject({ source: "website_quote", form: "quote", name: "Test Visitor", phone: "0812 3456 7890", email: "test@example.com", location: "Jl. Test 1, Canggu" })
    expect(input.quoteDetails).toMatchObject({
      site_type: "villa",
      installation_type: "hybrid",
      monthly_cost: 2500000,
      monthly_cost_unit: "Rp",
      reduction_percent: 60,
      meter_phase: "3",
      latitude: -8.65,
      longitude: 115.2167,
      maps_link: "https://www.google.com/maps?q=-8.650000,115.216700",
      language: "en",
      message: "Please call after 5pm",
      submitted_at: NOW.toISOString(),
    })
    expect(input.note.split("\n")[0]).toBe("2026-11-26 14:03 WITA: Quote request from the website")
  })

  it("files a chat message without quote details", async () => {
    const db = memoryStore()
    const result = await json(chat, db.store)
    expect(result.status).toBe(200)
    expect(db.ingested[0]).toMatchObject({ source: "website_chat", form: "chat", name: "Chat", quoteDetails: null, location: null })
    expect(db.ingested[0].note).toBe("2026-11-26 14:03 WITA: Chat message from the website\nMessage: Halo, berapa harga panel?")
  })

  it("stores the meter photo as a document, typed from its bytes", async () => {
    const db = memoryStore()
    const result = await multipart(quote, JPEG, db.store)
    expect(result.body).toMatchObject({ ok: true, lead_id: 101, photo: "saved" })
    expect(db.photos).toHaveLength(1)
    expect(db.photos[0]).toMatchObject({ leadId: 101, submissionId: quote.submission_id, mimeType: "image/jpeg", extension: "jpg" })
  })

  it("keeps the lead but not the file when the photo is not an image or too large", async () => {
    const notImage = memoryStore()
    const a = await multipart(quote, new TextEncoder().encode("<?php echo 1;"), notImage.store)
    expect(a.body).toMatchObject({ ok: true, photo: "skipped" })
    expect(notImage.photos).toHaveLength(0)
    expect(notImage.ingested[0].note).toContain("Meter photo: the file sent was not an image")

    const big = new Uint8Array(MAX_PHOTO_BYTES + 1)
    big.set(JPEG)
    const tooLarge = memoryStore()
    const b = await multipart(quote, big, tooLarge.store)
    expect(b.body).toMatchObject({ ok: true, photo: "skipped" })
    expect(tooLarge.ingested[0].note).toContain("Meter photo: too large for the CRM")
  })

  it("notes a photo the website did not send because it was too large", async () => {
    const db = memoryStore()
    await json({ ...quote, photo_skipped: "too_large" }, db.store)
    expect(db.ingested[0].note).toContain("Meter photo: too large for the CRM")
  })

  it("is idempotent: a retried submission writes nothing new and does not upload the photo twice", async () => {
    const db = memoryStore()
    await multipart(quote, JPEG, db.store)
    const retry = await multipart(quote, JPEG, db.store)
    expect(retry.body).toMatchObject({ ok: true, lead_id: 101, created: false, replayed: true, photo: "saved" })
    expect(db.ingested).toHaveLength(1)
    expect(db.photos).toHaveLength(1)
  })

  it("retries a photo that failed on the first delivery", async () => {
    const options = { failPhoto: true }
    const db = memoryStore(options)
    const first = await multipart(quote, JPEG, db.store)
    expect(first.body).toMatchObject({ ok: true, photo: "failed" })

    options.failPhoto = false
    const retry = await multipart(quote, JPEG, db.store)
    expect(retry.body).toMatchObject({ ok: true, replayed: true, photo: "saved" })
    expect(db.ingested).toHaveLength(1)
    expect(db.photos).toHaveLength(1)
  })

  it("answers 500 when the database write fails", async () => {
    const result = await json(chat, memoryStore({ failIngest: true }).store)
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ ok: false, error: "Could not save the lead" })
  })
})

describe("parseWebsiteLead", () => {
  it("requires a well-formed submission id, a phone and a valid email", () => {
    expect(parseWebsiteLead({ ...chat, submission_id: "short" })).toEqual({ ok: false, error: "submission_id is missing or malformed" })
    expect(parseWebsiteLead({ ...chat, phone: "12" })).toEqual({ ok: false, error: "phone is required" })
    expect(parseWebsiteLead({ ...chat, email: "nope" })).toEqual({ ok: false, error: "email is invalid" })
    expect(parseWebsiteLead({ ...chat, message: " " })).toEqual({ ok: false, error: "message is required for a chat" })
  })

  it("needs a GPS position or an address for a quote, and drops a half GPS pair", () => {
    const noPlace = { ...quote, quote: { ...quote.quote, latitude: null, longitude: null, address: "" } }
    expect(parseWebsiteLead(noPlace)).toEqual({ ok: false, error: "a GPS position or an address is required" })

    const halfGps = parseWebsiteLead({ ...quote, quote: { ...quote.quote, longitude: null } })
    expect(halfGps.ok && halfGps.lead.quote).toMatchObject({ latitude: null, longitude: null, maps_link: null, address: "Jl. Test 1, Canggu" })
  })

  it("keeps site_type_other only for 'other' and trims long text", () => {
    const other = parseWebsiteLead({ ...quote, quote: { ...quote.quote, site_type: "other", site_type_other: "Warehouse" } })
    expect(other.ok && other.lead.quote?.site_type_other).toBe("Warehouse")
    const villa = parseWebsiteLead({ ...quote, quote: { ...quote.quote, site_type_other: "ignored" } })
    expect(villa.ok && villa.lead.quote?.site_type_other).toBeNull()
    const long = parseWebsiteLead({ ...chat, message: "x".repeat(5000) })
    expect(long.ok && long.lead.message?.length).toBe(2000)
  })
})

describe("note and helpers", () => {
  it("formats WITA time and the quote lines staff read", () => {
    expect(witaStamp(new Date("2026-12-31T17:30:00Z"))).toBe("2027-01-01 01:30 WITA")
    const parsed = parseWebsiteLead({ ...quote, quote: { ...quote.quote, monthly_cost: 450, monthly_cost_unit: "kWh", meter_phase: "unsure" } })
    if (!parsed.ok) throw new Error(parsed.error)
    expect(buildNote(parsed.lead, NOW, null).split("\n")).toEqual([
      "2026-11-26 14:03 WITA: Quote request from the website",
      "Site: Villa",
      "Installation: Hybrid",
      "Monthly cost: 450 kWh",
      "Reduction: 60% less",
      "PLN meter: Not sure",
      "Address: Jl. Test 1, Canggu",
      "Map: https://www.google.com/maps?q=-8.650000,115.216700",
      "Message: Please call after 5pm",
    ])
  })

  it("recognises JPEG, PNG, WebP and HEIC by their bytes", () => {
    const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0))
    expect(imageKind(JPEG)?.mimeType).toBe("image/jpeg")
    expect(imageKind(bytes("\x89PNG\r\n\x1a\n...."))?.mimeType).toBe("image/png")
    expect(imageKind(bytes("RIFF\0\0\0\0WEBPVP8 "))?.mimeType).toBe("image/webp")
    expect(imageKind(bytes("\0\0\0\x18ftypheic\0\0\0\0"))?.mimeType).toBe("image/heic")
    expect(imageKind(bytes("%PDF-1.7"))).toBeNull()
  })
})
