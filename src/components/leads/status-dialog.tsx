"use client"

import { useState, useTransition } from "react"
import { changeLeadStatus } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"
import { useLeadFeedback } from "./feedback"

const NO_STATUS_WARNING =
  "This lead has no status yet. Once it has one it cannot go back to No status, but it can move to any other status later."

// Opened from a lead's "…" menu: nothing changes until "Set status" is pressed.
// `status` is the value the row was rendered with; the server refuses the change
// when the lead holds another status by now (someone else, or the WhatsApp AI).
export function StatusDialog({
  leadId,
  leadName,
  status,
  open,
  onClose,
}: {
  leadId: number
  leadName: string
  status: string | null
  open: boolean
  onClose: () => void
}) {
  const report = useLeadFeedback()
  const [choice, setChoice] = useState(status ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const current = isLeadStatus(status) ? LEAD_STATUS_SHORT[status] : (status ?? NO_STATUS_LABEL)

  const close = () => {
    if (pending) return
    setChoice(status ?? "")
    setError(null)
    onClose()
  }

  const save = () => {
    startTransition(async () => {
      try {
        const result = await changeLeadStatus(leadId, status, choice)
        if (result.ok) {
          setError(null)
          onClose()
          report(result)
        } else {
          setError(result.message)
        }
      } catch {
        setError("Status not changed: the server could not be reached. Check your connection and try again.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={pending}
      title={`Change the status of ${leadName}`}
      description={status ? `It is ${current} now.` : NO_STATUS_WARNING}
    >
      <fieldset className="mb-4">
        <legend className="sr-only">New status</legend>
        <ul className="flex flex-col gap-0.5">
          {LEAD_STATUSES.map((option) => (
            <li key={option}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-sm transition-colors duration-[120ms] hover:bg-surface-sunken has-[:focus-visible]:bg-surface-sunken md:min-h-10">
                <input
                  type="radio"
                  name={`status-${leadId}`}
                  value={option}
                  checked={choice === option}
                  onChange={() => setChoice(option)}
                  className="size-4 accent-[var(--ink)]"
                />
                <span>{LEAD_STATUS_SHORT[option]}</span>
                {option === status ? <span className="text-xs text-muted">Now</span> : null}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="secondary" onClick={close} disabled={pending} data-autofocus>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={pending || !isLeadStatus(choice) || choice === status}>
          {pending ? "Saving…" : "Set status"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
