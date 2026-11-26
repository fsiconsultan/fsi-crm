"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { changeLeadStatus } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"
import { useProfile } from "./profile-context"

/**
 * The seven statuses as radio rows. Nothing changes until "Set status". The
 * status the page was rendered with goes along as `from`, and the server
 * refuses the change when the customer holds another status by now (a
 * colleague, or the WhatsApp AI), so a stale page never overwrites it.
 */
export function StatusDialog({
  customerId,
  name,
  status,
  open,
  onClose,
}: {
  customerId: number
  name: string
  status: string | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { notify } = useProfile()
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
        const result = await changeLeadStatus(customerId, status, choice)
        if (!result.ok) return setError(result.message)
        setError(null)
        onClose()
        notify({ ok: true, text: result.message })
        router.refresh()
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
      title={`Change the status of ${name}`}
      description={
        status
          ? `It is ${current} now. A new status starts its day count again.`
          : "This customer has no status yet. Once it has one it cannot go back to No status."
      }
    >
      <fieldset className="mb-4">
        <legend className="sr-only">New status</legend>
        <ul className="flex flex-col gap-0.5">
          {LEAD_STATUSES.map((option) => (
            <li key={option}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-sm transition-colors duration-[120ms] hover:bg-surface-sunken has-[:focus-visible]:bg-surface-sunken md:min-h-10">
                <input
                  type="radio"
                  name={`status-${customerId}`}
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
        <Button onClick={close} disabled={pending} data-autofocus>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={pending || !isLeadStatus(choice) || choice === status}>
          {pending ? "Saving…" : "Set status"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
