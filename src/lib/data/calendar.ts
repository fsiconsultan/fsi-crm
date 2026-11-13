import "server-only"
import type { CustomerHit } from "@/components/schedules/customer-search"
import { gridRange, type Month } from "@/components/schedules/model"
import { searchLeads } from "@/lib/data/leads"
import { listSchedulesInRange } from "@/lib/data/schedules"
import type { ScheduleView } from "@/lib/schedules/types"
import { createClient } from "@/lib/supabase/server"

/** A schedule with the name of the customer it is with. */
export type CalendarItem = ScheduleView & { leadId: number; customerName: string | null }

export type CalendarMonth = { setUp: boolean; items: CalendarItem[] }

/**
 * Scheduled and done items on the whole weeks that hold `month`, soonest
 * first, with each customer's name. Runs as the signed-in user, so RLS limits
 * non-Admins to their own; `salesId` narrows further for Admin.
 */
export async function getCalendarMonth({ month, salesId }: { month: Month; salesId: string }): Promise<CalendarMonth> {
  const { from, to } = gridRange(month)
  const range = await listSchedulesInRange({ from, to, salesId: salesId || undefined, statuses: ["scheduled", "done"] })
  if (!range.setUp) return { setUp: false, items: [] }

  const withLead = range.items.flatMap((item) => (item.leadId === null ? [] : [{ ...item, leadId: item.leadId }]))
  const ids = [...new Set(withLead.map((item) => item.leadId))]
  const names = new Map<number, string | null>()
  if (ids.length > 0) {
    const supabase = await createClient()
    const { data, error } = await supabase.from("leads").select("id, customer_name").in("id", ids)
    if (error) throw new Error(`Loading customer names failed: ${error.message}`)
    for (const row of data) names.set(row.id, row.customer_name)
  }
  return { setUp: true, items: withLead.map((item) => ({ ...item, customerName: names.get(item.leadId) ?? null })) }
}

/**
 * False while the `lead_schedules` table is missing, so the page offers no
 * booking. Any other failure also answers false: the calendar below shows the
 * error itself.
 */
export async function schedulesReady(): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from("lead_schedules").select("id").limit(1)
  return !error
}

/**
 * The calendar's "New schedule" customer step: the command palette's search
 * (name, phone or business, same escaping), plus the fields the booking form
 * prefills. Both reads run as the signed-in user, so Sales only find their own
 * customers.
 */
export async function searchBookingCustomers(q: string, limit: number): Promise<CustomerHit[]> {
  const hits = await searchLeads(q, limit)
  if (hits.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("id, location, email, sales_id")
    .in(
      "id",
      hits.map((hit) => hit.id),
    )
  if (error) throw new Error(`Loading the customers' details failed: ${error.message}`)
  const details = new Map(data.map((row) => [row.id, row]))
  // A lead hidden between the two reads is dropped rather than shown half known.
  return hits.flatMap((hit) => {
    const more = details.get(hit.id)
    if (!more) return []
    return [
      {
        id: hit.id,
        name: hit.customer_name,
        phone: hit.phone,
        business: hit.business,
        location: more.location,
        status: hit.status,
        email: more.email,
        salesId: more.sales_id,
      },
    ]
  })
}
