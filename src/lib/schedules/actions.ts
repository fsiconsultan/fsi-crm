"use server"

import { revalidatePath } from "next/cache"
import { userScheduleDeps as deps } from "./deps"
import { cancelScheduleCore, createScheduleCore, markScheduleDoneCore, rescheduleScheduleCore } from "./service"
import type {
  CreateScheduleInput,
  RescheduleScheduleInput,
  ScheduleActionResult,
  ScheduleRefInput,
} from "./types"

// Server actions for the schedule UI. Each is reachable by a direct POST, so
// each reads the signed-in profile itself and runs as that user (RLS applies).
// Input is re-validated in service.ts; the TypeScript types are only a guide.

function revalidate(result: ScheduleActionResult) {
  if (!result.ok) return
  if (result.schedule.leadId) revalidatePath(`/customers/${result.schedule.leadId}`)
  revalidatePath("/calendar")
  revalidatePath("/leads")
  revalidatePath("/")
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduleActionResult> {
  const result = await createScheduleCore(await deps(), input)
  revalidate(result)
  return result
}

export async function rescheduleSchedule(input: RescheduleScheduleInput): Promise<ScheduleActionResult> {
  const result = await rescheduleScheduleCore(await deps(), input)
  revalidate(result)
  return result
}

export async function cancelSchedule(input: ScheduleRefInput): Promise<ScheduleActionResult> {
  const result = await cancelScheduleCore(await deps(), input)
  revalidate(result)
  return result
}

export async function markScheduleDone(input: ScheduleRefInput): Promise<ScheduleActionResult> {
  const result = await markScheduleDoneCore(await deps(), input)
  revalidate(result)
  return result
}
