import type { BookingOutcome, BookingRef, CustomerZone, OfferedSlot, ScheduleBooking } from "@/lib/ai/seams"
import {
  AI_BOOKABLE_KINDS,
  busyFromRows,
  checkSlotRules,
  findSlots,
  foreignGoogleBusy,
  isAiBookableKind,
  overlaps,
  searchWindow,
  slotAt,
  type AiBookableKind,
  type Interval,
  type Slot,
} from "./availability"
import type { GoogleBusy } from "./free-busy"
import { cancelScheduleCore, createScheduleCore, rescheduleScheduleCore, type ScheduleDeps } from "./service"
import type { ScheduleEventType } from "./store"
import { localDay, timeWithZone, whenShort } from "./time"
import { SCHEDULE_KIND_LABEL, type ScheduleView } from "./types"
import { toScheduleView } from "./view"
import { zoneForLocation, zoneLabel, type TimeZoneId } from "./zones"

// The WhatsApp assistant's scheduling, on top of the same create, reschedule
// and cancel functions staff use (legacy date column, Google sync and logging
// happen the same way). No Next.js or server-only imports, so tests run it
// with the in-memory store and a fake Google.

export type AiSchedulerDeps = {
  /** Must have actor { id: null, admin: true } and bookedVia "whatsapp_ai". */
  schedule: ScheduleDeps
  /** The shared calendar's busy times; not_connected when Google is not set up. */
  googleBusy: (fromIso: string, toIso: string) => Promise<GoogleBusy>
  ready: () => Promise<boolean>
}

/** "Tue 17 Nov, 10:00 to 12:00 WIB": always in the booking's zone, with its label. */
function label(slot: { startsAt: string; startTime: string; endTime: string | null; timeZone: TimeZoneId }) {
  const date = whenShort({ startsAt: slot.startsAt, endsAt: null, allDay: true }, slot.timeZone).replace(/, all day$/, "")
  return `${date}, ${timeWithZone(slot.startTime, slot.endTime, slot.timeZone)}`
}

function offered(slot: Slot): OfferedSlot {
  return { date: slot.date, startTime: slot.startTime, endTime: slot.endTime, label: label(slot), zoneLabel: zoneLabel(slot.timeZone) }
}

function toRef(view: ScheduleView): BookingRef {
  return {
    id: view.id,
    kind: view.kind as AiBookableKind,
    timeZone: view.timeZone,
    zoneLabel: view.zoneLabel,
    date: view.day,
    startTime: view.startTime ?? "00:00",
    endTime: view.endTime,
    label: view.allDay
      ? whenShort({ startsAt: view.startsAt, endsAt: null, allDay: true }, view.timeZone)
      : label({ startsAt: view.startsAt, startTime: view.startTime ?? "00:00", endTime: view.endTime, timeZone: view.timeZone }),
    salesId: view.salesId,
    bookedByAi: view.bookedBy === "ai",
    confirmed: view.bookedBy === "staff" || view.confirmedAt !== null,
    updatedAt: view.updatedAt,
  }
}

export function createAiScheduler(deps: AiSchedulerDeps): ScheduleBooking {
  const { schedule } = deps
  const store = schedule.store

  async function log(type: ScheduleEventType, leadId: number, conversationId: string, scheduleId: string | null, summary: string, failure = false) {
    try {
      await store.logEvent({
        type,
        leadId,
        conversationId,
        scheduleId,
        actorSalesId: null,
        summary: summary.slice(0, 500),
        detail: {},
        severity: failure ? "error" : "info",
        needsReview: failure,
      })
    } catch (error) {
      console.error("automation_events insert failed", type, error instanceof Error ? error.message : error)
    }
  }

  // Busy times for one salesperson in a window: their CRM items plus the
  // shared calendar's other events. Fails rather than guess when Google is
  // connected but cannot be read.
  async function busyFor(
    salesId: string,
    fromIso: string,
    toIso: string,
    excludeId?: string,
  ): Promise<{ ok: true; busy: Interval[] } | { ok: false; message: string }> {
    const rows = await store.listScheduledBetween(fromIso, toIso)
    const busy = busyFromRows(rows, salesId, excludeId)
    const google = await deps.googleBusy(fromIso, toIso)
    if (google.state === "failed") return { ok: false, message: `The shared Google Calendar could not be checked: ${google.message}` }
    if (google.state === "ok") busy.push(...foreignGoogleBusy(google.busy, rows))
    return { ok: true, busy }
  }

  async function slotsFrom(input: {
    kind: AiBookableKind
    fromDay: string
    preferredTime?: string | null
    salesId: string
    timeZone: TimeZoneId
    excludeId?: string
  }): Promise<{ ok: true; slots: OfferedSlot[] } | { ok: false; message: string }> {
    const now = schedule.now()
    const zone = input.timeZone
    const today = localDay(now, zone)
    const fromDay = input.fromDay < today ? today : input.fromDay
    const window = searchWindow(fromDay, zone)
    const busy = await busyFor(input.salesId, window.fromIso, window.toIso, input.excludeId)
    if (!busy.ok) return busy
    const slots = findSlots({ kind: input.kind, fromDay, preferredTime: input.preferredTime, now, busy: busy.busy, zone })
    return { ok: true, slots: slots.map(offered) }
  }

  // Rules first, then the calendar, re-read now: the slot may have gone since it was offered.
  async function claimable(input: {
    kind: AiBookableKind
    date: string
    startTime: string
    salesId: string
    leadId: number
    conversationId: string
    timeZone: TimeZoneId
    excludeId?: string
  }): Promise<{ ok: true; slot: Slot } | { ok: false; outcome: BookingOutcome }> {
    const problem = checkSlotRules(input.kind, input.date, input.startTime, schedule.now(), input.timeZone)
    if (problem) return { ok: false, outcome: { ok: false, reason: "rules", problem } }
    const slot = slotAt(input.kind, input.date, input.startTime, input.timeZone)
    const busy = await busyFor(input.salesId, slot.startsAt, slot.endsAt, input.excludeId)
    if (!busy.ok) {
      await log("schedule_ai_check_failed", input.leadId, input.conversationId, input.excludeId ?? null, busy.message, true)
      return { ok: false, outcome: { ok: false, reason: "calendar_unavailable", message: busy.message } }
    }
    const span = { start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) }
    if (busy.busy.some((b) => overlaps(span, b))) {
      const others = await slotsFrom({ ...input, fromDay: input.date, preferredTime: input.startTime })
      return { ok: false, outcome: { ok: false, reason: "slot_taken", alternatives: others.ok ? others.slots : [] } }
    }
    return { ok: true, slot }
  }

  return {
    ready: deps.ready,

    async customerZone({ leadId, answeredLocation }): Promise<CustomerZone> {
      const answer = zoneForLocation(answeredLocation)
      if (answer.confident) return { ...answer, source: "answer" }
      const lead = await store.getLead(leadId)
      const fromLead = zoneForLocation(lead?.location)
      if (fromLead.confident) return { ...fromLead, source: "lead" }
      return { zone: answer.zone, confident: false, source: null }
    },

    async availability(input) {
      if (!isAiBookableKind(input.kind)) return { ok: false, message: "This kind cannot be booked by the assistant." }
      const result = await slotsFrom(input)
      if (!result.ok) await log("schedule_ai_check_failed", input.leadId, input.conversationId, null, result.message, true)
      return result
    },

    async book(input) {
      const claim = await claimable(input)
      if (!claim.ok) return claim.outcome
      const name = input.customerName?.trim() || `Lead ${input.leadId}`
      const notes = [input.notes?.trim() ? `Customer's note: ${input.notes.trim()}` : null, "Booked by the WhatsApp assistant. Confirm it with the customer."]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000)
      const result = await createScheduleCore(schedule, {
        leadId: input.leadId,
        kind: input.kind,
        date: claim.slot.date,
        startTime: claim.slot.startTime,
        endTime: claim.slot.endTime,
        timeZone: claim.slot.timeZone,
        location: input.location?.trim().slice(0, 300) || undefined,
        title: `${SCHEDULE_KIND_LABEL[input.kind]} (booked on WhatsApp): ${name}`.slice(0, 200),
        notes,
        salesId: input.salesId,
        notifyLead: false,
      })
      if (!result.ok) {
        await log("schedule_ai_check_failed", input.leadId, input.conversationId, null, `The assistant could not book: ${result.message}`, true)
        return { ok: false, reason: "failed", message: result.message }
      }
      const booking = toRef(result.schedule)
      await log("schedule_ai_booked", input.leadId, input.conversationId, booking.id, `The assistant booked a ${SCHEDULE_KIND_LABEL[input.kind].toLowerCase()} for ${booking.label}, to confirm. ${result.message}`)
      return { ok: true, booking }
    },

    async upcoming(leadId) {
      const now = schedule.now().getTime()
      const rows = await store.listForLead(leadId, [...AI_BOOKABLE_KINDS])
      return rows
        .filter((row) => row.status === "scheduled" && Date.parse(row.starts_at) > now)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((row) => toRef(toScheduleView(row)))
    },

    async reschedule(input) {
      // The booking keeps its own zone; the customer gives the new time in it.
      const claim = await claimable({ ...input, kind: input.booking.kind, timeZone: input.booking.timeZone, excludeId: input.booking.id })
      if (!claim.ok) return claim.outcome
      const result = await rescheduleScheduleCore(schedule, {
        scheduleId: input.booking.id,
        loadedUpdatedAt: input.booking.updatedAt,
        date: claim.slot.date,
        startTime: claim.slot.startTime,
        endTime: claim.slot.endTime,
        timeZone: claim.slot.timeZone,
        notifyLead: false,
      })
      if (!result.ok) {
        await log("schedule_ai_check_failed", input.leadId, input.conversationId, input.booking.id, `The assistant could not move a booking: ${result.message}`, true)
        return { ok: false, reason: "failed", message: result.message }
      }
      const booking = toRef(result.schedule)
      await log("schedule_ai_rescheduled", input.leadId, input.conversationId, booking.id, `The assistant moved a booking from ${input.booking.label} to ${booking.label}, to confirm. ${result.message}`)
      return { ok: true, booking }
    },

    async cancel(input) {
      const result = await cancelScheduleCore(schedule, { scheduleId: input.booking.id, loadedUpdatedAt: input.booking.updatedAt })
      if (!result.ok) {
        await log("schedule_ai_check_failed", input.leadId, input.conversationId, input.booking.id, `The assistant could not cancel a booking: ${result.message}`, true)
        return { ok: false, message: result.message }
      }
      await log("schedule_ai_cancelled", input.leadId, input.conversationId, input.booking.id, `The customer cancelled on WhatsApp: ${input.booking.label}. ${result.message}`)
      return { ok: true }
    },
  }
}
