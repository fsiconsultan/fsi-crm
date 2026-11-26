// What the frenchsolarindustry.com forms send (actions/action_SendForm.php on
// the website). The website has already validated it; this checks again
// because the CRM must never trust a caller, even a signed one.

export const SITE_TYPES = ["villa", "house", "hotel", "restaurant", "office", "factory", "other"] as const
export const INSTALLATION_TYPES = ["ongrid", "hybrid", "offgrid", "unsure"] as const
export const COST_UNITS = ["Rp", "kWh"] as const
export const METER_PHASES = ["1", "3", "unsure"] as const

export type QuoteDetails = {
  site_type: (typeof SITE_TYPES)[number]
  site_type_other: string | null
  installation_type: (typeof INSTALLATION_TYPES)[number]
  monthly_cost: number
  monthly_cost_unit: (typeof COST_UNITS)[number]
  reduction_percent: number
  meter_phase: (typeof METER_PHASES)[number]
  latitude: number | null
  longitude: number | null
  maps_link: string | null
  address: string | null
  language: string | null
  message: string | null
  submitted_at: string
}

export type WebsiteLead = {
  submissionId: string
  form: "quote" | "chat"
  language: string | null
  name: string
  phone: string
  email: string
  message: string | null
  quote: Omit<QuoteDetails, "language" | "message" | "submitted_at"> | null
  // The website keeps photos up to 5 MB; the CRM takes smaller ones (see MAX_PHOTO_BYTES).
  photoSkipped: "too_large" | null
}

export type Parsed = { ok: true; lead: WebsiteLead } | { ok: false; error: string }

const SUBMISSION_ID = /^[A-Za-z0-9_-]{16,64}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Trimmed text with control characters removed and a length cap; "" becomes null.
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()
  return clean ? clean.slice(0, max) : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function num(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? n : null
}

export function parseWebsiteLead(input: unknown): Parsed {
  if (!isObj(input)) return { ok: false, error: "Body is not a JSON object" }

  const submissionId = typeof input.submission_id === "string" ? input.submission_id : ""
  if (!SUBMISSION_ID.test(submissionId)) return { ok: false, error: "submission_id is missing or malformed" }

  const form = oneOf(input.form, ["quote", "chat"] as const)
  if (!form) return { ok: false, error: "form must be quote or chat" }

  const first = text(input.first_name, 100)
  const last = text(input.last_name, 100)
  const name = [first, last].filter(Boolean).join(" ")
  if (!first) return { ok: false, error: "first_name is required" }

  const phone = text(input.phone, 30)
  if (!phone || phone.replace(/\D/g, "").length < 6) return { ok: false, error: "phone is required" }

  const email = text(input.email, 254)
  if (!email || !EMAIL.test(email)) return { ok: false, error: "email is invalid" }

  const message = text(input.message, 2000)
  if (form === "chat" && !message) return { ok: false, error: "message is required for a chat" }

  const photoSkipped = input.photo_skipped === "too_large" ? "too_large" : null
  const language = text(input.language, 5)

  if (form === "chat") {
    return { ok: true, lead: { submissionId, form, language, name, phone, email, message, quote: null, photoSkipped: null } }
  }

  const q = isObj(input.quote) ? input.quote : null
  if (!q) return { ok: false, error: "quote details are required" }

  const siteType = oneOf(q.site_type, SITE_TYPES)
  const siteOther = siteType === "other" ? text(q.site_type_other, 100) : null
  const installation = oneOf(q.installation_type, INSTALLATION_TYPES)
  const cost = num(q.monthly_cost, 1, 1e15)
  const unit = oneOf(q.monthly_cost_unit, COST_UNITS)
  const reduction = num(q.reduction_percent, 0, 100)
  const phase = oneOf(q.meter_phase, METER_PHASES)
  const lat = num(q.latitude, -90, 90)
  const lng = num(q.longitude, -180, 180)
  const hasGps = lat !== null && lng !== null
  const address = text(q.address, 500)

  if (!siteType || (siteType === "other" && !siteOther)) return { ok: false, error: "site_type is invalid" }
  if (!installation) return { ok: false, error: "installation_type is invalid" }
  if (cost === null || !Number.isInteger(cost)) return { ok: false, error: "monthly_cost is invalid" }
  if (!unit) return { ok: false, error: "monthly_cost_unit is invalid" }
  if (reduction === null || !Number.isInteger(reduction)) return { ok: false, error: "reduction_percent is invalid" }
  if (!phase) return { ok: false, error: "meter_phase is invalid" }
  if (!last) return { ok: false, error: "last_name is required" }
  if (!hasGps && !address) return { ok: false, error: "a GPS position or an address is required" }

  return {
    ok: true,
    lead: {
      submissionId,
      form,
      language,
      name,
      phone,
      email,
      message,
      photoSkipped,
      quote: {
        site_type: siteType,
        site_type_other: siteOther,
        installation_type: installation,
        monthly_cost: cost,
        monthly_cost_unit: unit,
        reduction_percent: reduction,
        meter_phase: phase,
        latitude: hasGps ? lat : null,
        longitude: hasGps ? lng : null,
        maps_link: hasGps ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}` : null,
        address,
      },
    },
  }
}
