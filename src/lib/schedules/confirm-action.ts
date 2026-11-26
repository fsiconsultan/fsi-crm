"use server"

import { revalidatePath } from "next/cache"
import { userScheduleDeps } from "./deps"
import { confirmScheduleCore } from "./service"
import type { ScheduleActionResult, ScheduleRefInput } from "./types"

/**
 * Confirm a booking the WhatsApp assistant made ("Booked by AI, to confirm").
 * Runs as the signed-in user (RLS applies): an Admin, or the salesperson whose
 * lead it is. Pass the item's `updatedAt` as `loadedUpdatedAt`; a stale value
 * returns `{ ok: false, stale: true }`. Nothing is emailed and the calendar
 * event is unchanged. Before migration 20261116090000 is applied it returns
 * `{ ok: false }` because no item can be an AI booking.
 */
export async function confirmSchedule(input: ScheduleRefInput): Promise<ScheduleActionResult> {
  const result = await confirmScheduleCore(await userScheduleDeps(), input)
  if (result.ok) {
    if (result.schedule.leadId) revalidatePath(`/customers/${result.schedule.leadId}`)
    revalidatePath("/calendar")
    revalidatePath("/leads")
    revalidatePath("/")
  }
  return result
}
