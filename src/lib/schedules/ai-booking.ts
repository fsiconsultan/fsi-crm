import "server-only"
import type { ScheduleBooking } from "@/lib/ai/seams"
import { createAdminClient } from "@/lib/whatsapp/admin-client"
import { createAiScheduler } from "./ai-scheduler"
import { googleBusy } from "./free-busy"
import type { ScheduleDeps } from "./service"
import { supabaseScheduleStore } from "./supabase-store"
import { BOOKED_VIA_AI } from "./view"

/**
 * The schedule service for the WhatsApp assistant's scheduling tools
 * (check_availability, book_schedule, reschedule_my_booking, cancel_my_booking).
 * It uses the secret-key client (the assistant is not a signed-in user), books
 * through the same create, reschedule and cancel functions staff use, marks
 * every booking as made by the assistant (booked_via), and never emails the
 * lead. Null without the secret key. The WhatsApp webhook passes it to
 * answerInbound, which hands it to runAgent.
 */
export function siteVisitBooking(baseUrl: string | null = null): ScheduleBooking | null {
  const db = createAdminClient()
  if (!db) return null
  const schedule: ScheduleDeps = {
    store: supabaseScheduleStore(db),
    actor: { id: null, admin: true },
    env: process.env,
    fetchFn: fetch,
    now: () => new Date(),
    baseUrl,
    bookedVia: BOOKED_VIA_AI,
  }
  return createAiScheduler({
    schedule,
    googleBusy: (fromIso, toIso) => googleBusy(fromIso, toIso, schedule),
    // The table, the assistant's columns (migration 20261116090000) and the
    // time zone column (20261117090000) must all exist: a customer outside
    // Bali could not be booked without it.
    async ready() {
      const { error } = await db.from("lead_schedules").select("id, booked_via, confirmed_at, time_zone").limit(1)
      return !error
    },
  })
}
