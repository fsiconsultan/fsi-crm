"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteLead, type ActionResult } from "@/app/(app)/leads/actions"
import { Button, buttonClass } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { useLeadFeedback } from "./feedback"

export function DeleteLeadButton({ leadId, leadName }: { leadId: number; leadName: string }) {
  const report = useLeadFeedback()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<ActionResult | null>(null)
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass("ghost", "w-11 px-0 text-muted hover:text-negative md:w-10")}
      >
        <Trash2 aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
        <span className="sr-only">Delete {leadName}</span>
      </button>

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
