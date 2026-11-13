"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { deleteLead, type ActionResult } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { useLeadFeedback } from "./feedback"

// Opened from a lead's "…" menu. The parent owns `open`, so the menu can close
// first and the dialog hands focus back to the menu button when it closes.
export function DeleteLeadDialog({
  leadId,
  leadName,
  open,
  onClose,
}: {
  leadId: number
  leadName: string
  open: boolean
  onClose: () => void
}) {
  const report = useLeadFeedback()
  const [error, setError] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const close = () => {
    if (pending) return
    onClose()
    setError(null)
  }

  const confirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteLead(leadId)
        if (result.ok) {
          onClose()
          report(result)
        } else {
          setError(result)
        }
      } catch {
        setError({
          ok: false,
          message: "Nothing was deleted: the server could not be reached. Check your connection and try again.",
        })
      }
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={close}
        busy={pending}
        title={`Delete ${leadName}?`}
        description="This removes the lead for everyone. It cannot be undone. A lead with uploaded documents cannot be deleted until they are removed on its customer page."
      >
        {error ? (
          <div role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
            <p>{error.message}</p>
            {error.link ? (
              <Link
                href={error.link.href}
                className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-4 md:min-h-8"
              >
                {error.link.label}
              </Link>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={close} disabled={pending} data-autofocus>
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
        </DialogFooter>
      </Dialog>
    </>
  )
}
