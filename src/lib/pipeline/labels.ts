// Where a lead came from, as pills on its pipeline card. "Quotation Web" is the
// website quote form (leads.source); "WhatsApp Chat" is a lead linked to a
// WhatsApp conversation (wa_conversations.lead_id), since the WhatsApp code does
// not set leads.source. A lead can have both.
export type SourceLabel = "web_quote" | "whatsapp"

export const SOURCE_LABEL_TEXT: Record<SourceLabel, string> = {
  web_quote: "Quotation Web",
  whatsapp: "WhatsApp Chat",
}

export function sourceLabels(source: string | null, hasWhatsApp: boolean): SourceLabel[] {
  const labels: SourceLabel[] = []
  if (source === "website_quote") labels.push("web_quote")
  if (hasWhatsApp) labels.push("whatsapp")
  return labels
}
