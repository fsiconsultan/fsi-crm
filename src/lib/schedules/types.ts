import type { TimeZoneId, ZoneLabel } from "./zones"

// Shared types for client schedules. No server-only imports: the UI may import
// these types and the label maps.

export const SCHEDULE_KINDS = ["appointment", "site_survey", "call", "follow_up"] as const
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number]

export const SCHEDULE_STATUSES = ["scheduled", "done", "cancelled"] as const
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

export type GoogleSyncStatus = "not_connected" | "pending" | "synced" | "failed"
export type EmailStatus = "not_requested" | "not_connected" | "sent" | "failed"

export const SCHEDULE_KIND_LABEL: Record<ScheduleKind, string> = {
  appointment: "Appointment",
  site_survey: "Site survey",
  call: "Call",
  follow_up: "Follow-up",
}

/** The legacy `leads` date column each kind keeps in sync. */
export type LegacyColumn = "appointment" | "site_survey" | "follow_up_date"

export const LEGACY_COLUMN: Record<ScheduleKind, LegacyColumn> = {
  appointment: "appointment",
  call: "appointment",
  site_survey: "site_survey",
  follow_up: "follow_up_date",
}

export function kindsForColumn(column: LegacyColumn): ScheduleKind[] {
  return SCHEDULE_KINDS.filter((kind) => LEGACY_COLUMN[kind] === column)
}

export function isScheduleKind(value: unknown): value is ScheduleKind {
  return typeof value === "string" && (SCHEDULE_KINDS as readonly string[]).includes(value)
}

/**
 * One schedule as the UI reads it. `startsAt`/`endsAt` are UTC. `day`,
 * `startTime` and `endTime` are in the booking's own zone (`timeZone`), which
 * is what the customer is told; the `office*` fields are the same moment in
 * Bali time (WITA), for staff views and day grouping. Both sets are equal when
 * the booking is in WITA.
 */
export type ScheduleView = {
  id: string
  leadId: number | null
  salesId: string | null
  kind: ScheduleKind
  title: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  /** The booking's IANA zone: Asia/Jakarta (WIB), Asia/Makassar (WITA) or Asia/Jayapura (WIT). */
  timeZone: TimeZoneId
  /** "WIB", "WITA" or "WIT": write it after every local time ("10:00 WIB"). */
  zoneLabel: ZoneLabel
  /** Local day in `timeZone`, YYYY-MM-DD. */
  day: string
  /** HH:MM in `timeZone`, null when all day. */
  startTime: string | null
  /** HH:MM in `timeZone`, null when all day or no end. */
  endTime: string | null
  /** Bali (WITA) day, YYYY-MM-DD: group staff calendars and lists by this. */
  officeDay: string
  /** HH:MM in WITA, null when all day. */
  officeStartTime: string | null
  /** HH:MM in WITA, null when all day or no end. */
  officeEndTime: string | null
  location: string | null
  notes: string | null
  status: ScheduleStatus
  previousStartsAt: string | null
  rescheduleCount: number
  notifyLead: boolean
  google: { status: GoogleSyncStatus; error: string | null; syncedAt: string | null }
  email: { status: EmailStatus; error: string | null; sentAt: string | null; to: string | null }
  /** "ai": booked by the WhatsApp assistant (lead_schedules.booked_via). "staff": everything else. */
  bookedBy: "ai" | "staff"
  /** When staff confirmed the assistant's booking; null otherwise (staff items never need it). */
  confirmedAt: string | null
  /** sales_users.id of who confirmed it. */
  confirmedBy: string | null
  /** True for a scheduled item the assistant booked that nobody has confirmed yet: show "Booked by AI, to confirm". */
  needsConfirmation: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  /** Pass back as `loadedUpdatedAt` when rescheduling, cancelling or marking done. */
  updatedAt: string
}

// ------------------------------------------------------------------ inputs

export type CreateScheduleInput = {
  leadId: number
  kind: ScheduleKind
  /** Optional; defaults to "<Kind>: <customer name>". */
  title?: string
  /** Local day in `timeZone`, YYYY-MM-DD. Today or later in that zone. */
  date: string
  /** HH:MM in `timeZone`. Required unless allDay. */
  startTime?: string
  /** HH:MM in `timeZone`, same day, after startTime. Optional (default one hour); not allowed for follow_up. */
  endTime?: string
  allDay?: boolean
  /**
   * The zone `date` and the times are in. Default: guessed from the lead's
   * location (zoneForLocation), else Asia/Makassar. Staff may override.
   */
  timeZone?: TimeZoneId
  location?: string
  notes?: string
  /** Admin only. Others are always assigned themselves. Admin default: the lead's salesperson. */
  salesId?: string | null
  /** Email the lead with a calendar file. Needs a valid email on the lead. */
  notifyLead?: boolean
}

export type RescheduleScheduleInput = {
  scheduleId: string
  /** The `updatedAt` the form was opened with. */
  loadedUpdatedAt: string
  /** Local day and times in `timeZone`. */
  date: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  /** Default: the booking's current zone. */
  timeZone?: TimeZoneId
  /** Defaults to the schedule's current notifyLead. */
  notifyLead?: boolean
}

export type ScheduleRefInput = { scheduleId: string; loadedUpdatedAt: string }

export type ScheduleField =
  | "leadId"
  | "kind"
  | "title"
  | "date"
  | "startTime"
  | "endTime"
  | "timeZone"
  | "location"
  | "notes"
  | "salesId"
  | "notifyLead"
  | "scheduleId"

// ------------------------------------------------------------------ results

export type LegacyOutcome = {
  status: "updated" | "cleared" | "unchanged" | "kept_manual" | "failed" | "skipped"
  column: LegacyColumn | null
  /** The column's value after the step (the booking's local day) when known. */
  value: string | null
  message: string
}

export type GoogleOutcome = {
  status: "synced" | "removed" | "not_connected" | "failed" | "skipped"
  message: string
}

export type EmailOutcome = {
  status: "sent" | "not_requested" | "no_address" | "not_connected" | "failed"
  message: string
}

export type ScheduleSteps = {
  legacy: LegacyOutcome
  google: GoogleOutcome
  email: EmailOutcome
}

export type ScheduleActionResult =
  | {
      ok: true
      /** One plain sentence per step, for a toast or inline notice. */
      message: string
      /** The row after every step (use its updatedAt for the next change). */
      schedule: ScheduleView
      steps: ScheduleSteps
      /** Set when a step's outcome could not be written to the row; the steps above are still true. */
      recordError?: string
    }
  | {
      ok: false
      /** Nothing was saved. */
      message: string
      fieldErrors?: Partial<Record<ScheduleField, string>>
      /** True when the row changed since it was loaded: reload and try again. */
      stale?: boolean
    }
