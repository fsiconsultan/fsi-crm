import type { Tables } from "@/lib/supabase/database.types"
import { localDay, localTime } from "./time"
import {
  isScheduleKind,
  type EmailStatus,
  type GoogleSyncStatus,
  type ScheduleStatus,
  type ScheduleView,
} from "./types"
import { isTimeZone, OFFICE_TIME_ZONE, zoneLabel, type TimeZoneId } from "./zones"

/**
 * Columns added after the table (migrations 20261116090000 and 20261117090000)
 * are optional here: rows read before those are applied do not have them.
 */
type AiColumns = "booked_via" | "confirmed_at" | "confirmed_by" | "time_zone"
export type ScheduleRow = Omit<Tables<"lead_schedules">, AiColumns> & Partial<Pick<Tables<"lead_schedules">, AiColumns>>

/** The value of lead_schedules.booked_via for the WhatsApp assistant's bookings. */
export const BOOKED_VIA_AI = "whatsapp_ai"

/** The booking's zone; rows without one (or before the migration) are WITA. */
export function zoneOf(row: Pick<ScheduleRow, "time_zone">): TimeZoneId {
  return isTimeZone(row.time_zone) ? row.time_zone : OFFICE_TIME_ZONE
}

export function toScheduleView(row: ScheduleRow): ScheduleView {
  const zone = zoneOf(row)
  const at = (iso: string | null, tz: TimeZoneId) => (row.all_day || !iso ? null : localTime(iso, tz))
  return {
    id: row.id,
    leadId: row.lead_id,
    salesId: row.sales_id,
    kind: isScheduleKind(row.kind) ? row.kind : "appointment",
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    timeZone: zone,
    zoneLabel: zoneLabel(zone),
    day: localDay(row.starts_at, zone),
    startTime: at(row.starts_at, zone),
    endTime: at(row.ends_at, zone),
    // An all-day item is about a calendar day, so it stays on that day for staff too.
    officeDay: row.all_day ? localDay(row.starts_at, zone) : localDay(row.starts_at, OFFICE_TIME_ZONE),
    officeStartTime: at(row.starts_at, OFFICE_TIME_ZONE),
    officeEndTime: at(row.ends_at, OFFICE_TIME_ZONE),
    location: row.location,
    notes: row.notes,
    status: row.status as ScheduleStatus,
    previousStartsAt: row.previous_starts_at,
    rescheduleCount: row.reschedule_count,
    notifyLead: row.notify_lead,
    google: { status: row.google_sync_status as GoogleSyncStatus, error: row.google_error, syncedAt: row.google_synced_at },
    email: {
      status: row.email_status as EmailStatus,
      error: row.email_error,
      sentAt: row.email_sent_at,
      to: row.lead_email_snapshot,
    },
    bookedBy: row.booked_via === BOOKED_VIA_AI ? "ai" : "staff",
    confirmedAt: row.confirmed_at ?? null,
    confirmedBy: row.confirmed_by ?? null,
    needsConfirmation: row.booked_via === BOOKED_VIA_AI && !row.confirmed_at && row.status === "scheduled",
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
