"use client"

import { useCallback, useId, useRef, useState } from "react"
import { FileText, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardHeader } from "@/components/ui/card"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, inputClass } from "@/components/ui/field"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import {
  DOCUMENT_BUCKET,
  DOCUMENT_TYPES,
  documentPath,
  formatFileSize,
  isDocumentType,
  listDocuments,
  SIGNED_URL_SECONDS,
  validatePdf,
  type CustomerDocument,
  type DocumentList,
} from "@/lib/data/documents"
import { createClient } from "@/lib/supabase/client"
import { supabaseEnv } from "@/lib/supabase/env"
import { formatDateTime } from "./format"

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; percent: number }
  | { phase: "saving" }
  | { phase: "done"; message: string }
  | { phase: "failed"; message: string }

// Sends the PDF straight to Storage as the signed-in user. XMLHttpRequest is
// used because it reports upload progress; storage RLS still decides access.
function uploadWithProgress(
  path: string,
  file: File,
  accessToken: string,
  onProgress: (percent: number) => void,
) {
  const { url, key } = supabaseEnv()
  const encodedPath = path.split("/").map(encodeURIComponent).join("/")

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", `${url}/storage/v1/object/${DOCUMENT_BUCKET}/${encodedPath}`)
    request.setRequestHeader("authorization", `Bearer ${accessToken}`)
    request.setRequestHeader("apikey", key)
    request.setRequestHeader("x-upsert", "false")
    request.setRequestHeader("content-type", "application/pdf")
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) return resolve()
      let reason = `the server answered ${request.status}`
      try {
        const body = JSON.parse(request.responseText)
        if (typeof body.message === "string") reason = body.message
      } catch {
        // Not JSON; the status code is all there is.
      }
      reject(new Error(reason))
    }
    request.onerror = () => reject(new Error("the connection dropped"))
    request.send(file)
  })
}

export function DocumentsPanel({
  customerId,
  initial,
}: {
  customerId: number
  initial: DocumentList
}) {
  const [list, setList] = useState<DocumentList>(initial)
  const [loading, setLoading] = useState(false)
  const [upload, setUpload] = useState<UploadState>({ phase: "idle" })
  const [openError, setOpenError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<CustomerDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  const reload = useCallback(async () => {
    setLoading(true)
    setList(await listDocuments(createClient(), customerId))
    setLoading(false)
  }, [customerId])

  const busy = upload.phase === "uploading" || upload.phase === "saving"

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get("file")
    const type = String(form.get("document_type") ?? "")
    setNotice(null)

    if (!(file instanceof File) || !file.name) {
      return setUpload({ phase: "failed", message: "Choose a PDF file first." })
    }
    if (!isDocumentType(type)) {
      return setUpload({ phase: "failed", message: "Choose a document type." })
    }
    const invalid = await validatePdf(file)
    if (invalid) return setUpload({ phase: "failed", message: invalid })

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return setUpload({
        phase: "failed",
        message: "Nothing was uploaded: your session has ended. Sign in again and retry.",
      })
    }

    const path = documentPath(customerId, file.name)
    setUpload({ phase: "uploading", percent: 0 })

    try {
      await uploadWithProgress(path, file, session.access_token, (percent) =>
        setUpload({ phase: "uploading", percent }),
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error"
      return setUpload({
        phase: "failed",
        message: `Nothing was uploaded: ${reason}. Check your connection and try again.`,
      })
    }

    setUpload({ phase: "saving" })
    const { error: insertError } = await supabase.from("customer_documents").insert({
      customer_id: customerId,
      document_type: type,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: "application/pdf",
      uploaded_by: session.user.id,
    })

    if (insertError) {
      // Take back the file that was just uploaded so it is not left without a record.
      const { data: removed, error: cleanupError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([path])
      const cleaned = !cleanupError && (removed?.length ?? 0) > 0
      return setUpload({
        phase: "failed",
        message: cleaned
          ? `The document was not added: its record could not be saved (${insertError.message}). The uploaded file was removed again, so you can retry.`
          : `The document was not added: its record could not be saved (${insertError.message}). The uploaded file could not be removed either and is now unused in storage; tell the admin.`,
      })
    }

    if (fileRef.current) fileRef.current.value = ""
    setUpload({ phase: "done", message: `"${file.name}" was uploaded.` })
    await reload()
  }

  async function onOpen(doc: CustomerDocument) {
    setOpenError(null)
    // Opened before the request so the browser treats it as a user-initiated tab.
    const tab = window.open("", "_blank")
    const { data, error } = await createClient()
      .storage.from(DOCUMENT_BUCKET)
      .createSignedUrl(doc.file_path, SIGNED_URL_SECONDS)

    if (error || !data?.signedUrl) {
      tab?.close()
      return setOpenError(
        `"${doc.file_name}" could not be opened: ${error?.message ?? "no link was returned"}. The file may be missing from storage; try again or upload it again.`,
      )
    }
    if (tab) {
      tab.opener = null
      tab.location.href = data.signedUrl
    } else {
      setOpenError("Your browser blocked the new tab. Allow pop-ups for this site and open the document again.")
    }
  }

  // Deletes exactly the one confirmed document: the stored file first, then
  // its record. That order can be retried from this list if the second step fails.
  async function onConfirmDelete() {
    if (!toDelete) return
    const target = toDelete
    setDeleting(true)
    setDeleteError(null)
    const supabase = createClient()
    const bucket = supabase.storage.from(DOCUMENT_BUCKET)

    const { data: removed, error: storageError } = await bucket.remove([target.file_path])
    if (storageError) {
      setDeleting(false)
      return setDeleteError(
        `Nothing was deleted: the file could not be removed from storage (${storageError.message}). Try again.`,
      )
    }
    if ((removed?.length ?? 0) === 0) {
      // Storage reports "nothing removed" both when the file is already gone and
      // when the user may not delete it. A signed URL tells the two apart.
      const { data: stillThere, error: checkError } = await bucket.createSignedUrl(target.file_path, 30)
      const alreadyGone = !stillThere?.signedUrl && /not.?found/i.test(checkError?.message ?? "")
      if (!alreadyGone) {
        setDeleting(false)
        return setDeleteError(
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
      await reload()
      return setDeleteError(
        `The file was removed from storage, but its record could not be deleted (${rowError?.message ?? "permission denied"}). It is still listed and can no longer be opened. Press Delete again to finish.`,
      )
    }

    setToDelete(null)
    setNotice(`"${target.file_name}" was deleted.`)
    await reload()
  }

  const documents = list.ok ? list.documents : []
  const groups = DOCUMENT_TYPES.map((type) => ({
    type: type as string,
    documents: documents.filter((doc) => doc.document_type === type),
  }))
  const known = new Set<string>(DOCUMENT_TYPES)
  const unknown = documents.filter((doc) => !known.has(doc.document_type))
  if (unknown.length > 0) groups.push({ type: "Other type", documents: unknown })

  return (
    <>
      <CardHeader
        title="Documents"
        meta={
          list.ok
            ? `${documents.length} ${documents.length === 1 ? "PDF" : "PDFs"}, private to this customer's team`
            : undefined
        }
      />

      {loading ? (
        <LoadingState label="Loading documents…" />
      ) : !list.ok ? (
        <ErrorState
          title="The documents could not be loaded"
          detail={`The server answered: ${list.message}. Nothing was changed.`}
          action={<Button onClick={reload}>Load again</Button>}
        />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents for this customer yet"
          detail="Upload the quotation, proposal or company profile as a PDF with the form below."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups
            .filter((group) => group.documents.length > 0)
            .map((group) => (
              <section key={group.type} aria-label={group.type}>
                <h3 className="mb-1 text-[13px] text-muted">
                  {group.type} <span className="tabular-nums">({group.documents.length})</span>
                </h3>
                <ul className="divide-y divide-line">
                  {group.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-1 py-1">
                      <button
                        type="button"
                        onClick={() => onOpen(doc)}
                        aria-label={`Open ${doc.file_name}`}
                        className="-mx-1 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] px-1 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken active:bg-surface-sunken"
                      >
                        <FileText aria-hidden="true" className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium">{doc.file_name}</span>
                          <span className="block text-[13px] tabular-nums text-muted">
                            {formatFileSize(doc.file_size)}, uploaded {formatDateTime(doc.uploaded_at)}
                          </span>
                        </span>
                        <span aria-hidden="true" className="shrink-0 text-sm font-medium underline underline-offset-2">
                          Open
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        className="shrink-0 px-3"
                        onClick={() => {
                          setDeleteError(null)
                          setNotice(null)
                          setToDelete(doc)
                        }}
                        aria-label={`Delete ${doc.file_name}`}
                      >
                        <Trash2 aria-hidden="true" className="size-[18px]" />
                        <span className="max-sm:sr-only">Delete</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {openError ? (
        <p role="alert" className="mt-3 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm">
          {openError}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 text-sm text-positive">
          {notice}
        </p>
      ) : null}

      <form onSubmit={onUpload} className="mt-6 border-t border-line pt-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
          <Field label="Document type" htmlFor={`${formId}-type`}>
            <select id={`${formId}-type`} name="document_type" defaultValue="Quotation" className={inputClass}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PDF file (10 MB at most)" htmlFor={`${formId}-file`}>
            <input
              ref={fileRef}
              id={`${formId}-file`}
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={() => setUpload({ phase: "idle" })}
              className={`${inputClass} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-sunken file:px-2.5 file:py-1 file:text-sm file:text-ink`}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            <Upload aria-hidden="true" className="size-4" />
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>

        {upload.phase === "uploading" ? (
          <div className="mt-4">
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={upload.percent}
              className="h-2 w-full rounded-full bg-surface-sunken"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${upload.percent}%` }} />
            </div>
            <p className="mt-1.5 text-[13px] tabular-nums text-muted">Uploading, {upload.percent}%</p>
          </div>
        ) : null}
        <div aria-live="polite">
          {upload.phase === "saving" ? (
            <p className="mt-3 text-[13px] text-muted">File uploaded. Saving its record…</p>
          ) : null}
          {upload.phase === "done" ? <p className="mt-3 text-sm text-positive">{upload.message}</p> : null}
        </div>
        {upload.phase === "failed" ? (
          <p role="alert" className="mt-3 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm">
            {upload.message}
          </p>
        ) : null}
      </form>

      <Dialog
        open={toDelete !== null}
        onClose={() => {
          if (!deleting) setToDelete(null)
        }}
        title="Delete this document?"
        description={
          toDelete
            ? `"${toDelete.file_name}" (${toDelete.document_type}) will be removed from this customer for everyone. This cannot be undone.`
            : undefined
        }
      >
        {deleteError ? (
          <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm">
            {deleteError}
          </p>
        ) : null}
        <DialogFooter>
          <Button onClick={() => setToDelete(null)} disabled={deleting} data-autofocus>
            Keep document
          </Button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-negative px-4 text-sm font-medium text-ink-contrast transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10"
          >
            {deleting ? "Deleting…" : "Delete document"}
          </button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
