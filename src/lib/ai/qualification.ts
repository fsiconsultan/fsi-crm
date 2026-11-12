// The qualification answers the contract lists: property type, electricity
// consumption or monthly PLN bill, location, electrical connection, expected
// savings and contact details. One definition feeds the tool schema, the
// completeness check and the inbox.

export const QUALIFICATION_FIELDS = [
  { key: "property_type", label: "Property type", hint: "House, villa, hotel, restaurant, factory, office, other." },
  { key: "monthly_pln_bill_idr", label: "Monthly PLN bill", hint: "As the customer states it, for example 'Rp 3.500.000'." },
  { key: "monthly_consumption_kwh", label: "Monthly consumption", hint: "As the customer states it, for example '1,200 kWh'." },
  { key: "location", label: "Location", hint: "Area or address of the property." },
  { key: "electrical_connection", label: "Electrical connection", hint: "PLN capacity and phase, for example '7,700 VA, 1 phase'." },
  { key: "expected_savings", label: "Expected savings", hint: "What the customer hopes to save or achieve, in their words." },
  { key: "contact_name", label: "Contact name", hint: "The name the customer gives." },
  { key: "contact_email", label: "Email", hint: "Optional." },
] as const

export type QualificationKey = (typeof QUALIFICATION_FIELDS)[number]["key"]
export type QualificationAnswers = Partial<Record<QualificationKey, string>>

const KEYS = QUALIFICATION_FIELDS.map((field) => field.key) as readonly string[]

// Keeps known keys with non-empty text; drops everything else the model sends.
export function cleanAnswers(input: unknown): QualificationAnswers {
  const out: QualificationAnswers = {}
  if (!input || typeof input !== "object") return out
  for (const [key, value] of Object.entries(input)) {
    if (!KEYS.includes(key)) continue
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : ""
    if (text) out[key as QualificationKey] = text.slice(0, 500)
  }
  return out
}

// Qualification is complete when every group has an answer. Bill and
// consumption are alternatives; email is optional.
export function missingAnswers(answers: QualificationAnswers): string[] {
  const missing: string[] = []
  if (!answers.property_type) missing.push("property_type")
  if (!answers.monthly_pln_bill_idr && !answers.monthly_consumption_kwh) {
    missing.push("monthly_pln_bill_idr or monthly_consumption_kwh")
  }
  if (!answers.location) missing.push("location")
  if (!answers.electrical_connection) missing.push("electrical_connection")
  if (!answers.expected_savings) missing.push("expected_savings")
  if (!answers.contact_name) missing.push("contact_name")
  return missing
}
