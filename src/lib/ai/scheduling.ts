import { AI_BOOKABLE_KINDS as AI_KINDS, isAiBookableKind as isKind, type AiBookableKind as Kind } from "@/lib/schedules/availability"
import { zoneDescription, zoneLabel } from "@/lib/schedules/zones"
import { decideAssignment } from "@/lib/whatsapp/assignment"
import type { WaStore } from "@/lib/whatsapp/store"
import type { Conversation } from "@/lib/whatsapp/types"
import { cleanAnswers } from "./qualification"
import type { BookingRef, CustomerZone, NotConfigured, OfferedSlot, ScheduleBooking, SlotProblem } from "./seams"
import type { Tool, ToolContext } from "./tools"

// The assistant's scheduling tools: check_availability, book_schedule,
// reschedule_my_booking and cancel_my_booking. Times only ever come from the
// schedule service; every booking is unconfirmed until staff confirm it, and
// anything these tools cannot do goes to a person.
//
// Times are the customer's local time: the zone comes from the location they
// gave in this chat (qualification answer), else leads.location. When neither
// names one zone, check_availability and book_schedule answer needs_location
// and the assistant asks for the city first. leads.location is never written here.

type Args = Record<string, unknown>
type Handoff = (ctx: ToolContext, args: Args) => Promise<unknown>

const KIND_TEXT: Record<Kind, string> = { site_survey: "site survey", appointment: "appointment", call: "call" }

const NOT_SET_UP: NotConfigured = {
  status: "not_configured",
  tell_customer:
    "Bookings cannot be made automatically yet. Do not offer or confirm any date or time. Note the customer's preferred day and time and say that an FSI representative will contact them to arrange it.",
}

const NEEDS_LOCATION = {
  status: "needs_location",
  note: "FSI books in the customer's own local time (WIB, WITA or WIT), and it is not clear where they are. Ask which city or area the property is in, save it with save_qualification_answers as location, then call this tool again. Do not offer, accept or guess any time until then.",
}

const PROBLEM_TEXT: Record<SlotProblem, string> = {
  bad_input: "The date must be YYYY-MM-DD and the time HH:MM (24-hour, the customer's local time).",
  not_working_day: "FSI does not book on that day. Call check_availability for another day.",
  outside_hours: "That time is outside FSI's working hours. Call check_availability and offer only the slots it returns.",
  too_soon: "That time is too soon to book. Call check_availability and offer only the slots it returns.",
  too_far: "That date is too far ahead to book now. Ask for an earlier date.",
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
const isHhMm = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim())
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)

const slotsOut = (slots: OfferedSlot[]) =>
  slots.map((s) => ({ date: s.date, start_time: s.startTime, end_time: s.endTime, time_zone: s.zoneLabel, label: s.label }))

// The customer's zone: their answer in this chat first, then the lead's location.
async function customerZone(ctx: ToolContext, ready: Extract<Ready, { ok: true }>): Promise<CustomerZone> {
  const saved = await ctx.store.getQualification(ready.conversation.id)
  const answered = cleanAnswers(saved?.answers).location ?? null
  return ready.booking.customerZone({ leadId: ready.leadId, answeredLocation: answered })
}

/**
 * Who the booking is with: the salesperson the existing assignment rule picks
 * (the lead's active owner, src/lib/whatsapp/assignment.ts), else the active
 * salesperson the conversation is assigned to. Null when there is nobody.
 */
export async function salespersonFor(store: WaStore, conversation: Conversation): Promise<string | null> {
  if (!conversation.lead_id) return null
  const lead = await store.getLead(conversation.lead_id)
  const ownerActive = lead?.sales_id ? await store.isSalesUserActive(lead.sales_id) : false
  const rule = decideAssignment(lead, ownerActive)
  if (rule) return rule.salesId
  const assignee = conversation.assigned_sales_id
  return assignee && (await store.isSalesUserActive(assignee)) ? assignee : null
}

type Ready =
  | { ok: true; booking: ScheduleBooking; conversation: Conversation; leadId: number }
  | { ok: false; result: unknown }

// Shared start of every scheduling tool: the service exists, nobody has taken
// over, and a lead is linked. Re-reads the conversation, which may have changed
// since the run started.
async function start(ctx: ToolContext): Promise<Ready> {
  if (!ctx.booking || !(await ctx.booking.ready())) return { ok: false, result: NOT_SET_UP }
  const conversation = (await ctx.store.getConversation(ctx.conversation.id)) ?? ctx.conversation
  ctx.conversation = conversation
  if (conversation.mode === "human") {
    return { ok: false, result: { status: "taken_over", note: "A person is handling this conversation. Do not book, change or confirm anything." } }
  }
  if (!conversation.lead_id) {
    return { ok: false, result: { status: "refused", reason: "No lead is linked yet. Call find_or_create_lead first, then try again." } }
  }
  return { ok: true, booking: ctx.booking, conversation, leadId: conversation.lead_id }
}

async function handOver(ctx: ToolContext, handoff: Handoff, reason: string) {
  await handoff(ctx, { reason })
  return {
    status: "handed_off",
    note: "Do not offer or confirm any time. Tell the customer a member of the FSI team will reply here about the booking, then stop.",
  }
}

function notify(ctx: ToolContext, salesId: string | null, body: string) {
  if (!salesId) return
  const conversation = ctx.conversation
  ctx.notices?.push((notifier) => notifier.scheduleChanged(conversation, salesId, body))
}

// Which of the lead's upcoming bookings the customer means. Only bookings the
// assistant made may be changed here; anything else goes to a person.
async function pickOwnBooking(
  ctx: ToolContext,
  ready: Extract<Ready, { ok: true }>,
  kind: unknown,
  handoff: Handoff,
  verb: "move" | "cancel",
): Promise<{ ok: true; booking: BookingRef } | { ok: false; result: unknown }> {
  if (kind !== undefined && !isKind(kind)) return { ok: false, result: { status: "error", message: "kind must be site_survey, appointment or call." } }
  const upcoming = await ready.booking.upcoming(ready.leadId)
  const matching = kind ? upcoming.filter((b) => b.kind === kind) : upcoming
  if (matching.length === 0) {
    return { ok: false, result: { status: "no_booking", note: "This customer has no upcoming booking of that kind. Say so; offer to book one if they want." } }
  }
  const own = matching.filter((b) => b.bookedByAi)
  if (own.length === 0) {
    return {
      ok: false,
      result: await handOver(ctx, handoff, `The customer asked to ${verb} a booking made by FSI staff (${matching[0].label}).`),
    }
  }
  if (own.length > 1) {
    return {
      ok: false,
      result: {
        status: "which_one",
        bookings: own.map((b) => ({ kind: b.kind, label: b.label })),
        note: "Ask the customer which one they mean, then call again with its kind.",
      },
    }
  }
  return { ok: true, booking: own[0] }
}

function scheduleRun(handoff: Handoff) {
  return {
    async check(ctx: ToolContext, args: Args) {
      const ready = await start(ctx)
      if (!ready.ok) return ready.result
      if (!isKind(args.kind) || !isDay(args.date) || (args.preferred_time !== undefined && !isHhMm(args.preferred_time))) {
        return { status: "error", message: "Pass kind (site_survey, appointment or call), date as YYYY-MM-DD and, optionally, preferred_time as HH:MM." }
      }
      const salesId = await salespersonFor(ctx.store, ready.conversation)
      if (!salesId) return handOver(ctx, handoff, "The customer wants to book, but no active salesperson is assigned to this lead.")
      const zone = await customerZone(ctx, ready)
      if (!zone.confident) return NEEDS_LOCATION
      const result = await ready.booking.availability({
        leadId: ready.leadId,
        conversationId: ready.conversation.id,
        salesId,
        kind: args.kind,
        fromDay: args.date.trim(),
        preferredTime: isHhMm(args.preferred_time) ? args.preferred_time.trim() : null,
        timeZone: zone.zone,
      })
      if (!result.ok) return handOver(ctx, handoff, "The calendar could not be checked, so the assistant could not offer times.")
      if (result.slots.length === 0) {
        return {
          status: "no_slots",
          note: "There is no free time in the days checked. Ask whether a later date suits them and check again, or offer to have a representative arrange it.",
        }
      }
      const label = zoneLabel(zone.zone)
      return {
        status: "ok",
        time_zone: zoneDescription(zone.zone),
        slots: slotsOut(result.slots),
        note: `Offer only these times. They are the customer's local time: always write them with "${label}". Book only after the customer has picked one and agreed to it.`,
      }
    },

    async book(ctx: ToolContext, args: Args) {
      const ready = await start(ctx)
      if (!ready.ok) return ready.result
      if (!isKind(args.kind) || !isDay(args.date) || !isHhMm(args.start_time)) {
        return { status: "error", message: "Pass kind (site_survey, appointment or call), date as YYYY-MM-DD and start_time as HH:MM." }
      }
      const kind = args.kind
      const salesId = await salespersonFor(ctx.store, ready.conversation)
      if (!salesId) return handOver(ctx, handoff, "The customer wants to book, but no active salesperson is assigned to this lead.")

      const zone = await customerZone(ctx, ready)
      if (!zone.confident) return NEEDS_LOCATION

      const existing = (await ready.booking.upcoming(ready.leadId)).filter((b) => b.kind === kind)
      if (existing.some((b) => !b.bookedByAi)) {
        return handOver(ctx, handoff, `The customer wants a ${KIND_TEXT[kind]}, but FSI staff already booked one (${existing[0].label}).`)
      }
      if (existing.length > 0) {
        return {
          status: "already_booked",
          booking: existing[0].label,
          note: "This customer already has this booking. If they want another time, use reschedule_my_booking; do not book a second one.",
        }
      }

      const outcome = await ready.booking.book({
        leadId: ready.leadId,
        conversationId: ready.conversation.id,
        salesId,
        kind,
        date: args.date.trim(),
        startTime: args.start_time.trim(),
        timeZone: zone.zone,
        location: text(args.location, 300),
        notes: text(args.notes, 500),
        customerName: ready.conversation.profile_name,
      })
      if (outcome.ok) {
        notify(ctx, salesId, `AI booked a ${KIND_TEXT[kind]}: ${outcome.booking.label}. Please confirm.`)
        return {
          status: "booked_unconfirmed",
          kind,
          date: outcome.booking.date,
          start_time: outcome.booking.startTime,
          end_time: outcome.booking.endTime,
          time_zone: outcome.booking.zoneLabel,
          label: outcome.booking.label,
          tell_customer: `Say it is booked for ${outcome.booking.label} and that an FSI representative will confirm it. Do not call it confirmed.`,
        }
      }
      if (outcome.reason === "slot_taken") {
        return {
          status: "slot_taken",
          alternatives: slotsOut(outcome.alternatives),
          note: "That time was just taken. Nothing was booked. Offer these times instead, or ask for another day.",
        }
      }
      if (outcome.reason === "rules") return { status: "not_allowed", reason: PROBLEM_TEXT[outcome.problem] }
      return handOver(ctx, handoff, `The assistant could not book a ${KIND_TEXT[kind]}: ${outcome.message}`)
    },

    async reschedule(ctx: ToolContext, args: Args) {
      const ready = await start(ctx)
      if (!ready.ok) return ready.result
      if (!isDay(args.new_date) || !isHhMm(args.new_start_time)) {
        return { status: "error", message: "Pass new_date as YYYY-MM-DD and new_start_time as HH:MM." }
      }
      const picked = await pickOwnBooking(ctx, ready, args.kind, handoff, "move")
      if (!picked.ok) return picked.result
      const salesId = picked.booking.salesId ?? (await salespersonFor(ctx.store, ready.conversation))
      if (!salesId) return handOver(ctx, handoff, "The customer wants to move a booking that has no active salesperson.")

      const outcome = await ready.booking.reschedule({
        leadId: ready.leadId,
        conversationId: ready.conversation.id,
        booking: picked.booking,
        salesId,
        date: args.new_date.trim(),
        startTime: args.new_start_time.trim(),
      })
      if (outcome.ok) {
        notify(ctx, salesId, `AI moved a ${KIND_TEXT[picked.booking.kind]} to ${outcome.booking.label}. Please confirm.`)
        return {
          status: "rescheduled_unconfirmed",
          from: picked.booking.label,
          label: outcome.booking.label,
          tell_customer: `Say it is moved to ${outcome.booking.label} and that an FSI representative will confirm it. Do not call it confirmed.`,
        }
      }
      if (outcome.reason === "slot_taken") {
        return { status: "slot_taken", alternatives: slotsOut(outcome.alternatives), note: "Nothing was changed. Offer these times instead." }
      }
      if (outcome.reason === "rules") return { status: "not_allowed", reason: PROBLEM_TEXT[outcome.problem] }
      return handOver(ctx, handoff, `The assistant could not move a booking: ${outcome.message}`)
    },

    async cancel(ctx: ToolContext, args: Args) {
      const ready = await start(ctx)
      if (!ready.ok) return ready.result
      const picked = await pickOwnBooking(ctx, ready, args.kind, handoff, "cancel")
      if (!picked.ok) return picked.result
      const result = await ready.booking.cancel({ leadId: ready.leadId, conversationId: ready.conversation.id, booking: picked.booking })
      if (!result.ok) return handOver(ctx, handoff, `The assistant could not cancel a booking: ${result.message}`)
      notify(ctx, picked.booking.salesId, `Customer cancelled a ${KIND_TEXT[picked.booking.kind]} on WhatsApp: ${picked.booking.label}.`)
      return { status: "cancelled", label: picked.booking.label, tell_customer: `Say the ${KIND_TEXT[picked.booking.kind]} on ${picked.booking.label} is cancelled.` }
    },
  }
}

const kindProperty = {
  type: "string",
  enum: [...AI_KINDS],
  description: "site_survey: visit to the property. appointment: meeting at the FSI office or online. call: phone call.",
}

export function scheduleTools(handoff: Handoff): Tool[] {
  const run = scheduleRun(handoff)
  return [
    {
      name: "check_availability",
      description:
        "Free times, in the customer's local time (WIB, WITA or WIT), with this customer's FSI salesperson on the given day and the next working days. The only source of times you may offer. Answers needs_location when the customer's city is not known yet.",
      parameters: {
        type: "object",
        properties: {
          kind: kindProperty,
          date: { type: "string", description: "First day to look at, YYYY-MM-DD, the customer's local date." },
          preferred_time: { type: "string", description: "Optional. The customer's preferred start, HH:MM in their local time." },
        },
        required: ["kind", "date"],
        additionalProperties: false,
      },
      run: run.check,
    },
    {
      name: "book_schedule",
      description:
        "Book one slot that check_availability returned, after the customer agreed to that exact day and time. Unconfirmed until an FSI representative confirms it.",
      parameters: {
        type: "object",
        properties: {
          kind: kindProperty,
          date: { type: "string", description: "YYYY-MM-DD, exactly as offered." },
          start_time: { type: "string", description: "HH:MM in the customer's local time, exactly as offered." },
          location: { type: "string", description: "Optional. Address for a site survey, or 'office' / 'online'." },
          notes: { type: "string", description: "Optional. Anything the customer asked the salesperson to know." },
        },
        required: ["kind", "date", "start_time"],
        additionalProperties: false,
      },
      run: run.book,
    },
    {
      name: "reschedule_my_booking",
      description:
        "Move this customer's upcoming booking that the assistant made to a new free time the customer agreed to. Bookings made by staff go to a person.",
      parameters: {
        type: "object",
        properties: {
          new_date: { type: "string", description: "YYYY-MM-DD, in the booking's time zone." },
          new_start_time: { type: "string", description: "HH:MM in the booking's time zone (the label its times are given with)." },
          kind: { ...kindProperty, description: "Optional. Which booking, when the customer has more than one." },
        },
        required: ["new_date", "new_start_time"],
        additionalProperties: false,
      },
      run: run.reschedule,
    },
    {
      name: "cancel_my_booking",
      description:
        "Cancel this customer's upcoming booking that the assistant made, after they clearly asked to cancel. Bookings made by staff go to a person.",
      parameters: {
        type: "object",
        properties: { kind: { ...kindProperty, description: "Optional. Which booking, when the customer has more than one." } },
        additionalProperties: false,
      },
      run: run.cancel,
    },
  ]
}
