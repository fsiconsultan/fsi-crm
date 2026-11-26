"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { dangerButtonClass } from "@/components/customers/delete-customer-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { cancelSchedule, markScheduleDone } from "@/lib/schedules/actions"
import { confirmSchedule } from "@/lib/schedules/confirm-action"
import { SCHEDULE_KIND_LABEL, type ScheduleView } from "@/lib/schedules/types"
import { cancelEmailNote, summarizeResult, type SummaryLine } from "./booking-model"
import { whenText } from "./model"
import { ResultSummary } from "./result-summary"
import type { ScheduleEnv } from "./schedule-provider"

type Outcome = { kind: "done"; lines: SummaryLine[] } | { kind: "error"; message: string; stale: boolean } | null

const COPY = {
  cancel: { keep: "Keep it", confirm: "Cancel it", busy: "Cancelling…", doneTitle: "Cancelled" },
  done: { keep: "Not yet", confirm: "Mark done", busy: "Saving…", doneTitle: "Marked done" },
  confirm: { keep: "Not yet", confirm: "Confirm booking", busy: "Confirming…", doneTitle: "Booking confirmed" },
} as const

/** Asks before cancelling, completing or confirming a schedule, then shows what each step did. */
export function ConfirmDialog({
  action,
  item,
  env,
  open,
  onClose,
}: {
  action: "cancel" | "done" | "confirm"
  item: ScheduleView
  env: ScheduleEnv
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [pending, startTransition] = useTransition()
  const copy = COPY[action]
  const kind = SCHEDULE_KIND_LABEL[item.kind].toLowerCase()

  const confirm = () => {
    startTransition(async () => {
      try {
        const ref = { scheduleId: item.id, loadedUpdatedAt: item.updatedAt }
        const result =
          action === "cancel" ? await cancelSchedule(ref) : action === "done" ? await markScheduleDone(ref) : await confirmSchedule(ref)
        if (!result.ok) return setOutcome({ kind: "error", message: result.message, stale: result.stale === true })
        // Confirming changes no calendar event and sends no email, so it is one line.
        setOutcome({
          kind: "done",
          lines:
            action === "confirm"
              ? [{ key: "saved", tone: "ok", text: `Confirmed in the CRM for ${whenText(result.schedule)}. The customer is not messaged automatically.` }]
              : summarizeResult(result, action),
        })
      } catch {
        setOutcome({ kind: "error", message: "Nothing was changed: the server could not be reached. Check your connection and try again.", stale: false })
      }
    })
  }

  const reload = () => {
    router.refresh()
    onClose()
  }

  if (outcome?.kind === "done") {
    return (
      <Dialog open={open} onClose={onClose} title={copy.doneTitle} description={item.title}>
        <ResultSummary lines={outcome.lines} />
        <DialogFooter>
          <Button variant="primary" onClick={onClose} autoFocus>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    )
  }

  const question =
    action === "cancel" ? `Cancel this ${kind}?` : action === "done" ? `Mark this ${kind} as done?` : `Confirm this ${kind}?`
  const detail =
    action === "cancel"
      ? cancelEmailNote(item, env.emailConnected)
      : action === "done"
        ? "It moves to Past. Nobody is emailed."
        : "The WhatsApp assistant booked this and told the customer a representative would confirm. Confirming marks it as checked in the CRM; the customer is not messaged automatically."

  return (
    <Dialog open={open} onClose={onClose} busy={pending} title={question} description={`${item.title}, ${whenText(item, env.today)}.`}>
      <p className="mb-4 text-sm text-ink">{detail}</p>
      {outcome?.kind === "error" ? (
        <div role="alert" className="mb-4 flex flex-col items-start gap-2 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
          <p>{outcome.stale ? "Someone changed this item since you opened the page. Nothing was changed. Reload to see the latest, then try again." : outcome.message}</p>
          {outcome.stale ? <Button onClick={reload}>Reload</Button> : null}
        </div>
      ) : null}
      <DialogFooter>
        <Button onClick={onClose} disabled={pending} data-autofocus>
          {copy.keep}
        </Button>
        {action === "cancel" ? (
          <button type="button" onClick={confirm} disabled={pending} className={dangerButtonClass}>
            {pending ? copy.busy : copy.confirm}
          </button>
        ) : (
          <Button variant="primary" onClick={confirm} disabled={pending}>
            {pending ? copy.busy : copy.confirm}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
