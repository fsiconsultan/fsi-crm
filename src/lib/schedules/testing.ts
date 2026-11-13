import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types"
import type { LeadForSchedule, ScheduleEvent, ScheduleStore } from "./store"
import type { LegacyColumn, ScheduleKind } from "./types"
import type { ScheduleRow } from "./view"

// In-memory ScheduleStore for tests. `visibleLeads` imitates RLS: a lead (and
// its schedules) outside the set is "not found".

export class FakeScheduleStore implements ScheduleStore {
  leads = new Map<number, LeadForSchedule>()
  rows = new Map<string, ScheduleRow>()
  names = new Map<string, string>()
  events: ScheduleEvent[] = []
  leadWrites: Array<{ leadId: number; column: LegacyColumn; value: string | null; updatedBy: string | null }> = []
  visibleLeads: Set<number> | null = null
  failRecord = false
  private tick = 0
  private ids = 0

  private stamp() {
    this.tick += 1
    return new Date(Date.UTC(2026, 10, 13, 0, 0, this.tick)).toISOString()
  }

  private visible(leadId: number | null) {
    return leadId !== null && (this.visibleLeads === null || this.visibleLeads.has(leadId))
  }

  addLead(lead: Partial<LeadForSchedule> & { id: number }) {
    this.leads.set(lead.id, {
      customer_name: `Customer ${lead.id}`,
      email: null,
      sales_id: null,
      appointment: null,
      site_survey: null,
      follow_up_date: null,
      location: null,
      ...lead,
    })
  }

  async getLead(id: number) {
    return this.visible(id) ? (this.leads.get(id) ?? null) : null
  }

  async salesName(id: string) {
    return this.names.get(id) ?? null
  }

  async insert(row: TablesInsert<"lead_schedules">): Promise<ScheduleRow> {
    this.ids += 1
    const now = this.stamp()
    const full: ScheduleRow = {
      id: `00000000-0000-4000-8000-${String(this.ids).padStart(12, "0")}`,
      lead_id: row.lead_id ?? null,
      sales_id: row.sales_id ?? null,
      kind: row.kind,
      title: row.title,
      starts_at: row.starts_at,
      ends_at: row.ends_at ?? null,
      all_day: row.all_day ?? false,
      location: row.location ?? null,
      notes: row.notes ?? null,
      status: row.status ?? "scheduled",
      previous_starts_at: null,
      reschedule_count: 0,
      ics_sequence: 0,
      completed_at: null,
      cancelled_at: null,
      notify_lead: row.notify_lead ?? false,
      lead_email_snapshot: null,
      google_event_id: null,
      google_sync_status: row.google_sync_status ?? "not_connected",
      google_error: null,
      google_synced_at: null,
      email_status: row.email_status ?? "not_requested",
      email_error: null,
      email_sent_at: null,
      email_message_id: null,
      created_by: row.created_by ?? null,
      updated_by: row.updated_by ?? null,
      booked_via: row.booked_via ?? null,
      confirmed_at: row.confirmed_at ?? null,
      confirmed_by: row.confirmed_by ?? null,
      time_zone: row.time_zone ?? "Asia/Makassar",
      created_at: now,
      updated_at: now,
    }
    this.rows.set(full.id, full)
    return { ...full }
  }

  async get(id: string) {
    const row = this.rows.get(id)
    return row && this.visible(row.lead_id) ? { ...row } : null
  }

  async updateIfUnchanged(id: string, updatedAt: string, patch: TablesUpdate<"lead_schedules">) {
    const row = this.rows.get(id)
    if (!row || row.updated_at !== updatedAt) return null
    return this.update(id, patch)
  }

  async update(id: string, patch: TablesUpdate<"lead_schedules">) {
    if (this.failRecord && ("google_sync_status" in patch || "email_status" in patch)) {
      throw new Error("The schedule could not be updated: network down")
    }
    const row = this.rows.get(id)
    if (!row) throw new Error("no row")
    const next = { ...row, ...patch, updated_at: this.stamp() } as ScheduleRow
    this.rows.set(id, next)
    return { ...next }
  }

  async listForLead(leadId: number, kinds: ScheduleKind[]) {
    return [...this.rows.values()].filter((row) => row.lead_id === leadId && (kinds as string[]).includes(row.kind))
  }

  async listScheduledBetween(fromIso: string, toIso: string) {
    const from = Date.parse(fromIso)
    const to = Date.parse(toIso)
    return [...this.rows.values()]
      .filter((row) => {
        if (row.status !== "scheduled") return false
        const start = Date.parse(row.starts_at)
        const end = row.ends_at ? Date.parse(row.ends_at) : null
        return start < to && (end === null ? start >= from : end > from)
      })
      .map((row) => ({ ...row }))
  }

  async setLeadDate(leadId: number, column: LegacyColumn, value: string | null, updatedBy: string | null) {
    const lead = this.leads.get(leadId)
    if (!lead) throw new Error("permission denied")
    lead[column] = value
    this.leadWrites.push({ leadId, column, value, updatedBy })
  }

  async logEvent(event: ScheduleEvent) {
    this.events.push(event)
  }
}
