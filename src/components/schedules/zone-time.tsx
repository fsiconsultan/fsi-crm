import type { ScheduleView } from "@/lib/schedules/types"
import { officeTimeLabel, whenLabel } from "./model"

type Timed = Pick<
  ScheduleView,
  "allDay" | "day" | "startTime" | "endTime" | "timeZone" | "officeDay" | "officeStartTime" | "officeEndTime"
>

/**
 * A schedule's day and time as the customer was told it ("Tue, 18 Nov · 10:00
 * to 11:00 WIB"), then, when the zone is not WITA, the Bali office time in
 * muted text (" · 11:00 to 12:00 WITA"). Screen readers hear "in Bali" after it.
 */
export function ZoneTime({ item, today }: { item: Timed; today?: string }) {
  const office = officeTimeLabel(item, today)
  return (
    <>
      <span className="tabular-nums">{whenLabel(item, today)}</span>
      {office ? (
        <span className="tabular-nums text-muted">
          {" · "}
          {office}
          <span className="sr-only"> in Bali</span>
        </span>
      ) : null}
    </>
  )
}
