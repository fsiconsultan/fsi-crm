import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types"
import type { LegacyColumn, ScheduleKind } from "./types"
import type { ScheduleRow } from "./view"

// What the schedule service needs from the database. The Supabase version is
// in supabase-store.ts; tests use an in-memory fake. Every method throws an
// Error with a readable message when the database refuses.

export type LeadForSchedule = {
  id: number
  customer_name: string | null
  email: string | null
  sales_id: string | null
  appointment: string | null
  site_survey: string | null
  follow_up_date: string | null
  /** Free text; the default time zone of a new booking comes from it (zones.ts zoneForLocation). */
  location: string | null
}

export type ScheduleEventType =
  | "schedule_google_failed"
  | "schedule_email_failed"
  // The WhatsApp assistant's scheduling (docs/schedules.md).
  | "schedule_ai_booked"
  | "schedule_ai_rescheduled"
  | "schedule_ai_cancelled"
  | "schedule_ai_check_failed"

export type ScheduleEvent = {
  type: ScheduleEventType
  leadId: number
  /** Null for a check that did not touch a schedule. */
  scheduleId: string | null
  actorSalesId: string | null
  summary: string
  detail: Record<string, string | number | null>
  /** Defaults: "error" and true (a failure for review). */
  severity?: "info" | "warning" | "error"
  needsReview?: boolean
  conversationId?: string | null
}

export interface ScheduleStore {
  getLead(id: number): Promise<LeadForSchedule | null>
  salesName(id: string): Promise<string | null>
  insert(row: TablesInsert<"lead_schedules">): Promise<ScheduleRow>
  get(id: string): Promise<ScheduleRow | null>
  /** Applies the patch only while updated_at still equals `updatedAt`; null when it did not. */
  updateIfUnchanged(id: string, updatedAt: string, patch: TablesUpdate<"lead_schedules">): Promise<ScheduleRow | null>
  update(id: string, patch: TablesUpdate<"lead_schedules">): Promise<ScheduleRow>
  /** Every schedule of these kinds on the lead, any status. */
  listForLead(leadId: number, kinds: ScheduleKind[]): Promise<ScheduleRow[]>
  /** Every scheduled (not done or cancelled) item of any lead and salesperson overlapping [fromIso, toIso). */
  listScheduledBetween(fromIso: string, toIso: string): Promise<ScheduleRow[]>
  setLeadDate(leadId: number, column: LegacyColumn, value: string | null, updatedBy: string | null): Promise<void>
  logEvent(event: ScheduleEvent): Promise<void>
}
