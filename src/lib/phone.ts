// Phone numbers in leads.phone are free text. WhatsApp identifies a customer by
// digits only, country code first ("62812..."). normalizePhone turns the free
// text into that form. The SQL function public.normalize_phone_wa applies the
// same rules to fill leads.phone_wa; change both together.

const MIN_DIGITS = 10
const MIN_INDONESIAN_DIGITS = 11
const MAX_DIGITS = 15

// What separates two numbers in one field: "/", ",", ";", a newline, two or
// more spaces, " - ", or the word "dan" ("and").
const SEPARATORS = /[/,;\n]|\s{2,}|\s-\s|\bdan\b/i

// A field can hold several numbers ("0812... / 0813..."). The first part that
// is a valid number wins. If none is, the text up to the first "/", "," or ";"
// is read as one number, so "0812  3456 7890" (a stray double space) still works.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  for (const part of raw.split(SEPARATORS)) {
    const number = normalizeOne(part)
    if (number) return number
  }
  return normalizeOne(raw.split(/[/,;]/)[0])
}

function normalizeOne(first: string): string | null {
  let digits = first.replace(/\D/g, "")
  if (!digits) return null

  // Written with a country code ("+81 90...", "0081 90..."): only "62" means
  // Indonesia, so the local "8..." rule below must not apply.
  let international = /^[^\d]*\+/.test(first)
  if (digits.startsWith("00")) {
    digits = digits.slice(2)
    international = true
  }

  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`
  else if (digits.startsWith("62")) {
    // Already in WhatsApp form.
  } else if (digits.startsWith("0")) digits = `62${digits.slice(1)}`
  // No country code starts with 0, so "+0812..." is a local number typed with a +.
  else if (digits.startsWith("8") && !international) digits = `62${digits}`
  // Anything else is kept as an international number (61..., 33..., 49...).

  if (digits.startsWith("62") && digits.length < MIN_INDONESIAN_DIGITS) return null
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null

  return digits
}

export type PhoneLead = { id: number; phone: string | null; phone_wa?: string | null }

export type LeadMatch<T extends PhoneLead> =
  | { kind: "none" }
  | { kind: "unique"; lead: T }
  | { kind: "ambiguous"; leads: T[] }

// A WhatsApp id (Meta's wa_id) is always country code first, with no "+":
// "819012345678" is Japanese, never an Indonesian "8..." mobile. Reading it as
// if a "+" were there keeps the local rule away from it.
export function normalizeWaId(waId: string): string | null {
  return normalizePhone(`+${waId.replace(/^\s*\+/, "")}`)
}

// Finds the lead a WhatsApp number belongs to. When several leads share the
// number it says so and returns all of them; the caller logs that for a person
// to resolve. It never picks one silently.
export function matchLeadByPhone<T extends PhoneLead>(leads: T[], waId: string): LeadMatch<T> {
  const target = normalizeWaId(waId)
  if (!target) return { kind: "none" }

  const matches = leads.filter((lead) => (lead.phone_wa ?? normalizePhone(lead.phone)) === target)

  if (matches.length === 0) return { kind: "none" }
  if (matches.length === 1) return { kind: "unique", lead: matches[0] }
  return { kind: "ambiguous", leads: matches }
}

// "628123456789" -> "+62 812 3456 789". Display only.
export function formatPhone(digits: string): string {
  if (digits.startsWith("62") && digits.length >= MIN_INDONESIAN_DIGITS) {
    const rest = digits.slice(2)
    return `+62 ${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}`.trim()
  }
  return `+${digits}`
}
