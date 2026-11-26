// How quote answers read in the CRM (lead note and the quote card). No server
// imports, so the card can use it too.

const SITE_LABELS: Record<string, string> = {
  villa: "Villa", house: "House", hotel: "Hotel", restaurant: "Restaurant", office: "Office", factory: "Factory", other: "Other",
}
const INSTALLATION_LABELS: Record<string, string> = {
  ongrid: "On-grid", hybrid: "Hybrid", offgrid: "Off-grid", unsure: "Not sure",
}

export function siteLabel(type: string, other: string | null) {
  return type === "other" && other ? `Other (${other})` : (SITE_LABELS[type] ?? type)
}
export function installationLabel(type: string) {
  return INSTALLATION_LABELS[type] ?? type
}
export function costLabel(amount: number, unit: string) {
  const grouped = amount.toLocaleString("id-ID")
  return unit === "Rp" ? `Rp ${grouped}` : `${grouped} kWh`
}
export function phaseLabel(phase: string) {
  return phase === "unsure" ? "Not sure" : `${phase} phase`
}
