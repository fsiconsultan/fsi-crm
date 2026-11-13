import { toScheduleView, type ScheduleRow } from "@/lib/schedules/view"
import type { ScheduleView } from "@/lib/schedules/types"

// Builds a ScheduleView the way the loaders do (through toScheduleView), so
// tests see the real Bali day and WITA times. For unit tests only.

let next = 0

export function makeSchedule(row: Partial<ScheduleRow> = {}): ScheduleView {
  next += 1
  return toScheduleView({
    id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
    lead_id: 4465,
    sales_id: null,
    kind: "appointment",
    title: "Appointment: Test customer",
    starts_at: "2026-11-18T02:00:00.000Z",
    ends_at: "2026-11-18T03:00:00.000Z",
    all_day: false,
    location: null,
    notes: null,
    status: "scheduled",
    previous_starts_at: null,
    reschedule_count: 0,
    ics_sequence: 0,
    completed_at: null,
    cancelled_at: null,
    notify_lead: false,
    lead_email_snapshot: null,
    google_event_id: null,
    google_sync_status: "not_connected",
    google_error: null,
    google_synced_at: null,
    email_status: "not_requested",
    email_error: null,
    email_sent_at: null,
    email_message_id: null,
    created_by: null,
    updated_by: null,
    created_at: "2026-11-13T00:00:00.000Z",
    updated_at: "2026-11-13T00:00:00.000Z",
    ...row,
  })
}
