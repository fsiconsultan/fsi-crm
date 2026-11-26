import type { Json } from "@/lib/supabase/database.types"
import { costLabel, installationLabel, phaseLabel, siteLabel } from "@/lib/website-lead/labels"

export type QuoteRow = { label: string; value: string }
export type QuoteView = { cost: string | null; reduction: number | null; rows: QuoteRow[]; mapHref: string | null }

const LANGUAGES: Record<string, string> = { en: "English", id: "Indonesian", fr: "French" }

function str(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}
function num(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

// leads.quote_details as rows for the read-only quote card, in the order the
// website form asks them. Only answers that are present become rows; anything
// that is not an object (a hand-edited value, say) gives no rows.
export function quoteRows(details: Json | null): QuoteRow[] {
  if (!details || typeof details !== "object" || Array.isArray(details)) return []
  const d = details as { [key: string]: Json | undefined }
  const rows: QuoteRow[] = []

  const site = str(d.site_type)
  if (site) rows.push({ label: "Site", value: siteLabel(site, str(d.site_type_other)) })
  const installation = str(d.installation_type)
  if (installation) rows.push({ label: "Installation", value: installationLabel(installation) })
  const cost = num(d.monthly_cost)
  const unit = str(d.monthly_cost_unit)
  if (cost !== null && unit) rows.push({ label: "Monthly cost", value: costLabel(cost, unit) })
  const reduction = num(d.reduction_percent)
  if (reduction !== null) rows.push({ label: "Wants to cut", value: `${reduction}%` })
  const phase = str(d.meter_phase)
  if (phase) rows.push({ label: "PLN meter", value: phaseLabel(phase) })
  const address = str(d.address)
  const lat = num(d.latitude)
  const lng = num(d.longitude)
  if (address) rows.push({ label: "Address", value: address })
  else if (lat !== null && lng !== null) rows.push({ label: "Location", value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
  const language = str(d.language)
  if (language) rows.push({ label: "Language", value: LANGUAGES[language] ?? language })
  const message = str(d.message)
  if (message) rows.push({ label: "Message", value: message })

  return rows
}

export function quoteSubmittedAt(details: Json | null): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null
  return str((details as { [key: string]: Json | undefined }).submitted_at)
}

// The card's layout: monthly cost and reduction as the headline, the rest as rows.
export function quoteView(details: Json | null): QuoteView | null {
  const rows = quoteRows(details)
  if (rows.length === 0) return null
  const take = (label: string) => rows.find((row) => row.label === label)?.value ?? null
  const reduction = take("Wants to cut")
  return {
    cost: take("Monthly cost"),
    reduction: reduction === null ? null : Number.parseInt(reduction, 10),
    rows: rows.filter((row) => row.label !== "Monthly cost" && row.label !== "Wants to cut"),
    mapHref: quoteMapHref(details),
  }
}

// "Open in Google Maps" appears only when the visitor shared their GPS position
// on the form; a typed address alone gets no button. Only a Google Maps link
// to a coordinate pair is accepted.
export function quoteMapHref(details: Json | null): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null
  const maps = str((details as { [key: string]: Json | undefined }).maps_link)
  return maps && /^https:\/\/www\.google\.com\/maps\?q=-?[\d.]+,-?[\d.]+$/.test(maps) ? maps : null
}
