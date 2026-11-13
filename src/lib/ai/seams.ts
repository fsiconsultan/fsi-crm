import type { TimeZoneId, ZoneLabel } from "@/lib/schedules/zones"

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

/** One upcoming item on the conversation's lead, as the scheduling tools see it. */
export type BookingRef = {
  id: string
  kind: "site_survey" | "appointment" | "call"
  /** The booking's zone; date and times below are in it. */
  timeZone: TimeZoneId
  zoneLabel: ZoneLabel
  date: string
  startTime: string
  endTime: string | null
  /** "Fri 20 Nov, 10:00 to 12:00 WIB" */
  label: string
  salesId: string | null
  bookedByAi: boolean
  confirmed: boolean
  updatedAt: string
}

/** Local day and HH:MM in the customer's zone; `label` ends with the zone label ("... WIB"). */
export type OfferedSlot = { date: string; startTime: string; endTime: string; label: string; zoneLabel: ZoneLabel }

/** The customer's zone as the scheduling tools see it. Not confident: ask the customer for their city first. */
export type CustomerZone = {
  zone: TimeZoneId
  confident: boolean
  /** Where it came from: the location the customer gave in this chat, or leads.location. */
  source: "answer" | "lead" | null
  matched?: string
}

export type SlotProblem = "bad_input" | "not_working_day" | "outside_hours" | "too_soon" | "too_far"

export type BookingOutcome =
  | { ok: true; booking: BookingRef }
  | { ok: false; reason: "rules"; problem: SlotProblem }
  | { ok: false; reason: "slot_taken"; alternatives: OfferedSlot[] }
  | { ok: false; reason: "calendar_unavailable" | "failed"; message: string }

/**
 * The schedule service as the WhatsApp assistant may use it. Implemented in
 * src/lib/schedules/ai-scheduler.ts and wired with the secret-key client in
 * ai-booking.ts. `ready` is false until lead_schedules and its AI columns exist.
 * Everything it books is marked as booked by the assistant, unconfirmed, and
 * never emailed to the lead.
 */
export interface ScheduleBooking {
  ready(): Promise<boolean>
  /**
   * The customer's zone: from the location saved as a qualification answer in
   * this chat when it names one zone, else from leads.location. Never writes
   * leads.location.
   */
  customerZone(input: { leadId: number; answeredLocation: string | null }): Promise<CustomerZone>
  availability(input: {
    leadId: number
    conversationId: string
    salesId: string
    kind: BookingRef["kind"]
    /** Local day in `timeZone`. */
    fromDay: string
    preferredTime?: string | null
    timeZone: TimeZoneId
  }): Promise<{ ok: true; slots: OfferedSlot[] } | { ok: false; message: string }>
  book(input: {
    leadId: number
    conversationId: string
    salesId: string
    kind: BookingRef["kind"]
    /** Local day and HH:MM in `timeZone`. */
    date: string
    startTime: string
    timeZone: TimeZoneId
    location?: string | null
    notes?: string | null
    customerName: string | null
  }): Promise<BookingOutcome>
  /** Scheduled items of the bookable kinds on this lead that have not started yet, soonest first. */
  upcoming(leadId: number): Promise<BookingRef[]>
  reschedule(input: {
    leadId: number
    conversationId: string
    booking: BookingRef
    salesId: string
    /** Local day and HH:MM in the booking's own zone (booking.timeZone), which it keeps. */
    date: string
    startTime: string
  }): Promise<BookingOutcome>
  cancel(input: { leadId: number; conversationId: string; booking: BookingRef }): Promise<{ ok: true } | { ok: false; message: string }>
}
