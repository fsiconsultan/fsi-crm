// Seams for the two features the contract defers. Each returns "not configured"
// until its inputs exist. The agent relays that honestly; it must never fill
// the gap with its own numbers, prices or dates.

export type NotConfigured = { status: "not_configured"; tell_customer: string }

export type IndicativeSystemInput = {
  monthly_pln_bill_idr?: string
  monthly_consumption_kwh?: string
  electrical_connection?: string
  location?: string
  property_type?: string
}

// Needs FSI's approved engineering rules, product catalogue and pricing, none of
// which have been supplied. When they are, implement the calculation here and
// return { status: "ok", ... } with the approved figures.
export async function calculateIndicativeSystem(input: IndicativeSystemInput): Promise<NotConfigured> {
  void input
  return {
    status: "not_configured",
    tell_customer:
      "An indicative system size, saving or price cannot be calculated automatically yet. Do not estimate one. Say that an FSI representative will prepare it from the details collected.",
  }
}

export type SiteVisitInput = { preferred_time?: string; address?: string }

// Google Calendar booking is a later phase. When it is built, check
// availability and create the event here.
export async function bookSiteVisit(input: SiteVisitInput): Promise<NotConfigured> {
  void input
  return {
    status: "not_configured",
    tell_customer:
      "Site visits cannot be booked automatically yet. Do not confirm a date or time. Note the customer's preferred time and say that an FSI representative will confirm the visit.",
  }
}
