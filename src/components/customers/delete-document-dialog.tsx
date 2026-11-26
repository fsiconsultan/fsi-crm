"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { DOCUMENT_BUCKET, type CustomerDocument } from "@/lib/data/documents"
import { createClient } from "@/lib/supabase/client"
import { dangerButtonClass } from "./delete-customer-dialog"

export const WRONG_PATH = "its record points outside this customer's folder. Tell the admin; nothing was changed."

/**
 * Deletes exactly the one confirmed document: the stored file first, then its
 * record. That order can be retried from the list if the second step fails.
 * `target` null keeps the dialog closed.
 */
export function DeleteDocumentDialog({
  customerId,
  target,
  onClose,
  onDeleted,
  onChanged,
}: {
  customerId: number
  target: CustomerDocument | null
  onClose: () => void
  onDeleted: (doc: CustomerDocument) => void
  /** The list may be out of date (the file went but the record stayed): reload it. */
  onChanged: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (deleting) return
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!target) return
    // Files live under `<lead id>/`. A record pointing anywhere else is refused,
    // so a wrong row can never delete another customer's file.
    if (!target.file_path.startsWith(`${customerId}/`)) return setError(`Nothing was deleted: ${WRONG_PATH}`)
    setDeleting(true)
    setError(null)
    const supabase = createClient()
    const bucket = supabase.storage.from(DOCUMENT_BUCKET)

    const { data: removed, error: storageError } = await bucket.remove([target.file_path])
    if (storageError) {
      setDeleting(false)
      return setError(`Nothing was deleted: the file could not be removed from storage (${storageError.message}). Try again.`)
    }
    if ((removed?.length ?? 0) === 0) {
      // Storage reports "nothing removed" both when the file is already gone and
      // when the user may not delete it. A signed URL tells the two apart.
      const { data: stillThere, error: checkError } = await bucket.createSignedUrl(target.file_path, 30)
      // Storage answers a missing object with HTTP 400 and statusCode "404"
      // (or a plain 404); the message is only a fallback.
      const failure = checkError as { status?: number; statusCode?: string; message?: string } | null
      const alreadyGone =
        !stillThere?.signedUrl &&
        failure !== null &&
        (failure.status === 404 || failure.statusCode === "404" || /not.?found/i.test(failure.message ?? ""))
      if (!alreadyGone) {
        setDeleting(false)
        return setError(
          stillThere?.signedUrl
            ? "Nothing was deleted: you do not have permission to remove this file. Ask an Admin."
            : `Nothing was deleted: storage did not confirm the file was removed (${checkError?.message ?? "no answer"}). Try again.`,
        )
      }
    }

    const { data: deletedRows, error: rowError } = await supabase
      .from("customer_documents")
      .delete()
      .eq("id", target.id)
      .select("id")

    setDeleting(false)
    if (rowError || (deletedRows?.length ?? 0) === 0) {
      onChanged()
      return setError(
        `The file was removed from storage, but its record could not be deleted (${rowError?.message ?? "permission denied"}). It is still listed and can no longer be opened. Press Delete again to finish.`,
      )
    }

    onDeleted(target)
  }

  return (
    <Dialog
      open={target !== null}
      onClose={close}
      busy={deleting}
      title="Delete this document?"
      description={
        target
          ? `"${target.file_name}" (${target.document_type}) will be removed from this customer for everyone. This cannot be undone.`
          : undefined
      }
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button onClick={close} disabled={deleting} data-autofocus>
          Keep document
        </Button>
        <button type="button" onClick={confirm} disabled={deleting} className={dangerButtonClass}>
          {deleting ? "Deleting…" : "Delete document"}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
