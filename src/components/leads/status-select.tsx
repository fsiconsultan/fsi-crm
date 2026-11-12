"use client"

import { useState, useTransition } from "react"
import { changeLeadStatus } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { controlClass } from "@/components/ui/control"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/cn"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"
import { useLeadFeedback } from "./feedback"

export function StatusSelect({
  leadId,
  leadName,
  status,
}: {
  leadId: number
  leadName: string
  /** The status the row was rendered with; the server refuses the change if it differs now. */
  status: string | null
}) {
  const report = useLeadFeedback()
  const [value, setValue] = useState(status ?? "")
  const [confirming, setConfirming] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const apply = (next: string) => {
    setValue(next)
    startTransition(async () => {
      try {
        const result = await changeLeadStatus(leadId, status, next)
        if (!result.ok) setValue(status ?? "")
        report(result)
      } catch {
        setValue(status ?? "")
        report({ ok: false, message: "Status not changed: the server could not be reached. Check your connection and try again." })
      }
      setConfirming(null)
    })
  }

  const choose = (next: string) => {
    // "No status" is not in the list, so the first status a lead gets cannot
    // be undone here. Ask before giving it.
    if (!status) setConfirming(next)
    else apply(next)
  }

  return (
    <>
      <select
        aria-label={`Status of ${leadName}`}
        value={value}
        disabled={pending}
        onChange={(event) => choose(event.target.value)}
        className={cn(controlClass, "pr-8", !value && "text-muted", pending && "opacity-60")}
      >
        {/* Leads with no status, or a value from outside the list, keep showing what is stored. */}
        {!isLeadStatus(value) ? (
          <option value={value} disabled>
            {value || NO_STATUS_LABEL}
          </option>
        ) : null}
        {LEAD_STATUSES.map((option) => (
          <option key={option} value={option}>
            {LEAD_STATUS_SHORT[option]}
          </option>
        ))}
      </select>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        busy={pending}
        title={`Set ${leadName} to ${confirming && isLeadStatus(confirming) ? LEAD_STATUS_SHORT[confirming] : ""}?`}
        description="This lead has no status yet. Once it has one, it cannot be set back to No status, but it can be moved to any other status later."
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => confirming && apply(confirming)} disabled={pending}>
            {pending ? "Saving…" : "Set status"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
