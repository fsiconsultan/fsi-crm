"use client"

import { useId, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, inputClass } from "@/components/ui/field"
import { PillSelect } from "@/components/ui/pill-select"
import {
  DOCUMENT_BUCKET,
  DOCUMENT_TYPES,
  documentPath,
  isDocumentType,
  validatePdf,
} from "@/lib/data/documents"
import { createClient } from "@/lib/supabase/client"
import { supabaseEnv } from "@/lib/supabase/env"

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; percent: number }
  | { phase: "saving" }
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

/**
 * "Upload PDF": a type (pill menu) and a file. The checks are the bucket's own
 * (PDF only, 10 MB) and run before anything is sent. The file goes to Storage
 * first, then its record; if the record fails the file is taken back.
 */
export function UploadDialog({
  customerId,
  open,
  onClose,
  onUploaded,
}: {
  customerId: number
  open: boolean
  onClose: () => void
  onUploaded: (fileName: string) => void
}) {
  const [upload, setUpload] = useState<UploadState>({ phase: "idle" })
  const submitting = useRef(false)
  const formId = useId()
  const busy = upload.phase === "uploading" || upload.phase === "saving"

  const close = () => {
    if (busy) return
    setUpload({ phase: "idle" })
    onClose()
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Set before the first await, so a second tap cannot start a second upload.
    if (submitting.current) return
    submitting.current = true
    try {
      await runUpload(new FormData(event.currentTarget))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error"
      setUpload({
        phase: "failed",
        message: `The upload stopped unexpectedly (${reason}). Reload the page to see whether the document was added before trying again.`,
      })
    } finally {
      submitting.current = false
    }
  }

  async function runUpload(form: FormData) {
    const file = form.get("file")
    const type = String(form.get("document_type") ?? "")

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
      const { data: removed, error: cleanupError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path])
      const cleaned = !cleanupError && (removed?.length ?? 0) > 0
      return setUpload({
        phase: "failed",
        message: cleaned
          ? `The document was not added: its record could not be saved (${insertError.message}). The uploaded file was removed again, so you can retry.`
          : `The document was not added: its record could not be saved (${insertError.message}). The uploaded file could not be removed either and is now unused in storage; tell the admin.`,
      })
    }

    setUpload({ phase: "idle" })
    onUploaded(file.name)
  }

  return (
    <Dialog open={open} onClose={close} busy={busy} title="Upload a PDF" description="PDF files only, 10 MB at most.">
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-4">
        <PillSelect
          name="document_type"
          label="Document type"
          defaultValue="Quotation"
          options={DOCUMENT_TYPES.map((type) => ({ value: type, label: type }))}
          autoFocus
        />
        <Field label="File" htmlFor={`${formId}-file`}>
          <input
            id={`${formId}-file`}
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={() => setUpload({ phase: "idle" })}
            className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-1 file:text-sm file:text-ink`}
          />
        </Field>

        {upload.phase === "uploading" ? (
          <div>
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
          {upload.phase === "saving" ? <p className="text-[13px] text-muted">File uploaded. Saving its record…</p> : null}
        </div>
        {upload.phase === "failed" ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
            {upload.message}
          </p>
        ) : null}
      </form>
      <DialogFooter>
        <Button onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" form={formId} variant="primary" disabled={busy}>
          <Upload aria-hidden="true" className="size-4" />
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
