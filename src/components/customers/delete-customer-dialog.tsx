"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { deleteLead } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"

/** The confirm button of a destructive dialog. */
export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-negative px-4 text-sm font-medium text-ink-contrast transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10"

/**
 * Deletes the customer through the Leads action, which refuses while the
 * customer has documents (their PDFs would be left in storage). The count the
 * page loaded is said up front; the server checks again.
 */
export function DeleteCustomerDialog({
  customerId,
  name,
  documentCount,
  open,
  onClose,
}: {
  customerId: number
  name: string
  /** null when the documents could not be loaded. */
  documentCount: number | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const blocked = (documentCount ?? 0) > 0

  const close = () => {
    if (pending) return
    setError(null)
    onClose()
  }

  const confirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteLead(customerId)
        if (!result.ok) return setError(result.message)
        router.replace("/customers")
      } catch {
        setError("Nothing was deleted: the server could not be reached. Check your connection and try again.")
      }
    })
  }

  const documents = documentCount === 1 ? "1 document" : `${documentCount} documents`

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={pending}
      title={`Delete ${name}?`}
      description={
        blocked
          ? `This customer has ${documents}. Delete ${documentCount === 1 ? "it" : "them"} in the Documents card first, then delete the customer.`
          : "This removes the customer for everyone, with their dates and notes. It cannot be undone."
      }
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button onClick={close} disabled={pending} data-autofocus>
          Keep customer
        </Button>
        {blocked ? null : (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className={dangerButtonClass}
          >
            {pending ? "Deleting…" : "Delete customer"}
          </button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
