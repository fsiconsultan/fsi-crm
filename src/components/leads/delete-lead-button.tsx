"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteLead } from "@/app/(app)/leads/actions"
import { Button, buttonClass } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useLeadFeedback } from "./feedback"

export function DeleteLeadButton({ leadId, leadName }: { leadId: number; leadName: string }) {
  const report = useLeadFeedback()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const close = () => {
    if (pending) return
    setOpen(false)
    setError(null)
  }

  const confirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteLead(leadId)
        if (result.ok) {
          setOpen(false)
          report(result)
        } else {
          setError(result.message)
        }
      } catch {
        setError("Nothing was deleted: the server could not be reached. Check your connection and try again.")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass("ghost", "w-11 px-0 text-muted hover:text-negative md:w-10")}
      >
        <Trash2 aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
        <span className="sr-only">Delete {leadName}</span>
      </button>

      <Dialog open={open} onClose={close} title={`Delete ${leadName}?`}>
        <p className="text-sm text-muted">
          This removes the lead and the records of its uploaded documents for everyone. It cannot be undone.
        </p>
        {error ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={pending} autoFocus>
            Keep lead
          </Button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-negative px-4 text-sm font-medium text-ink-contrast transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10"
          >
            {pending ? "Deleting…" : "Delete lead"}
          </button>
        </div>
      </Dialog>
    </>
  )
}
