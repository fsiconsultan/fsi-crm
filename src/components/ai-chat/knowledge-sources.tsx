"use client"

import { useState, useTransition } from "react"
import { FileText, Image as ImageIcon, NotebookPen, Plus, Trash2, Upload } from "lucide-react"
import {
  deleteKnowledgeSource,
  recordKnowledgeFile,
  saveNote,
  type FormResult,
} from "@/app/(app)/ai-chat/actions"
import { dangerButtonClass } from "@/components/customers/delete-customer-dialog"
import { Card, CardHeader } from "@/components/ui/card"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { IconCircle } from "@/components/ui/icon-circle"
import { pillClass } from "@/components/ui/pill"
import { EmptyState } from "@/components/ui/states"
import {
  KNOWLEDGE_ACCEPT,
  KNOWLEDGE_BUCKET,
  KNOWLEDGE_STATUS_LABEL,
  KNOWLEDGE_TYPES,
  knowledgeMimeType,
  knowledgePath,
  validateKnowledgeFile,
  type KnowledgeSource,
} from "@/lib/ai-chat/settings"
import { formatFileSize } from "@/lib/data/documents"
import { createClient } from "@/lib/supabase/client"
import { ResultLine, textareaClass, useSettingsForm } from "./form-bits"

type Notice = { ok: boolean; message: string } | null
type Open = "file" | "note" | null

const iconButtonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 md:size-9"

function describe(source: KnowledgeSource) {
  if (source.kind === "note") return `Note, ${(source.body ?? "").length.toLocaleString("en-US")} characters`
  const type = source.mime_type ? (KNOWLEDGE_TYPES[source.mime_type]?.label ?? source.mime_type) : "File"
  return `${type}, ${formatFileSize(source.file_size)}`
}

export function KnowledgeCard({ sources }: { sources: KnowledgeSource[] }) {
  const [open, setOpen] = useState<Open>(null)
  const [deleting, setDeleting] = useState<KnowledgeSource | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const show = (which: Open) => {
    setNotice(null)
    setOpen(which)
  }
  const saved = (message: string) => {
    setOpen(null)
    setDeleting(null)
    setNotice({ ok: true, message })
  }

  return (
    <Card as="section">
      <CardHeader
        id="knowledge-title"
        title="Knowledge"
        meta="What the AI may answer from. Files are read once OpenAI is connected."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => show("file")} className={pillClass("tinted")}>
          <Upload aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Upload file
        </button>
        <button type="button" onClick={() => show("note")} className={pillClass("tinted")}>
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Add FAQ or note
        </button>
      </div>

      {notice ? (
        <p
          role={notice.ok ? "status" : "alert"}
          className={
            notice.ok
              ? "mb-3 text-[13px] text-positive"
              : "mb-3 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink"
          }
        >
          {notice.message}
        </p>
      ) : null}

      {sources.length === 0 ? (
        <EmptyState
          title="No knowledge yet"
          detail="Upload price lists, product sheets or brochures (PDF, Word, images, text), or write an FAQ. Each waits for indexing until OpenAI is connected."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line" aria-labelledby="knowledge-title">
          {sources.map((source) => (
            <li key={source.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <IconCircle
                icon={source.kind === "note" ? NotebookPen : source.mime_type?.startsWith("image/") ? ImageIcon : FileText}
                tint="grey"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{source.title}</p>
                <p className="truncate text-xs text-muted">
                  {describe(source)} · {KNOWLEDGE_STATUS_LABEL[source.status] ?? source.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotice(null)
                  setDeleting(source)
                }}
                className={iconButtonClass}
                aria-label={`Delete ${source.title}`}
              >
                <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open === "file" ? <UploadDialog onClose={() => setOpen(null)} onSaved={saved} /> : null}
      {open === "note" ? <NoteDialog onClose={() => setOpen(null)} onSaved={saved} /> : null}
      <DeleteSourceDialog source={deleting} onClose={() => setDeleting(null)} onDeleted={saved} />
    </Card>
  )
}

function UploadDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(form: FormData) {
    const file = form.get("file")
    const title = String(form.get("title") ?? "").trim()
    if (!(file instanceof File) || !file.name) return setError("Choose a file first.")
    const invalid = validateKnowledgeFile(file)
    if (invalid) return setError(invalid)
    if (title.length > 200) return setError("Keep the title under 200 characters.")

    const supabase = createClient()
    const path = knowledgePath(file.name)
    const mimeType = knowledgeMimeType(file)
    const bucket = supabase.storage.from(KNOWLEDGE_BUCKET)
    const { error: uploadError } = await bucket.upload(path, file, { contentType: mimeType, upsert: false })
    if (uploadError) return setError(`Nothing was uploaded: ${uploadError.message}. Check your connection and try again.`)

    const result = await recordKnowledgeFile({ title, path, fileName: file.name, mimeType, size: file.size })
    if (!result.ok) {
      // The record failed, so take the file back out of storage.
      const { error: cleanupError } = await bucket.remove([path])
      return setError(
        cleanupError
          ? `The file was uploaded but could not be listed (${result.message}), and removing it failed too. Tell a Developer: ${path}`
          : `Nothing was added: ${result.message}`,
      )
    }
    onSaved(result.message)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title="Upload a file"
      description="PDF, Word (.docx), PNG, JPEG, WebP or text (.txt), up to 20 MB. Only Admins and Developers can open it."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError(null)
          try {
            await upload(new FormData(event.currentTarget))
          } catch (caught) {
            setError(`The upload stopped unexpectedly (${caught instanceof Error ? caught.message : "unknown error"}). Reload to see whether it was added.`)
          } finally {
            setBusy(false)
          }
        }}
        className="flex flex-col gap-4"
      >
        <Field label="File" htmlFor="knowledge-file">
          <input
            id="knowledge-file"
            name="file"
            type="file"
            accept={KNOWLEDGE_ACCEPT}
            required
            data-autofocus
            className={`${inputClass} py-2.5 file:mr-3 file:rounded-[var(--radius-control)] file:border-0 file:bg-surface-sunken file:px-3 file:py-1 file:text-sm file:text-ink`}
          />
        </Field>
        <Field label="Title" htmlFor="knowledge-title-input" hint="Optional. The file name is used when empty.">
          <input id="knowledge-title-input" name="title" className={inputClass} aria-describedby="knowledge-title-input-hint" />
        </Field>
        {error ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={busy} className={pillClass("tinted", "justify-center")}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={pillClass("on", "justify-center")}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function NoteDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [dirty, setDirty] = useState(false)
  const { state, pending, onSubmit, errors } = useSettingsForm(saveNote, (next: FormResult) => onSaved(next.message))

  return (
    <Dialog
      open
      onClose={onClose}
      busy={pending}
      dismissOnBackdrop={!dirty}
      title="Add an FAQ or note"
      description="Questions and answers, opening hours, service areas: anything the AI may use when it replies."
    >
      <form onSubmit={onSubmit} onInput={() => setDirty(true)} className="flex flex-col gap-4">
        <Field label="Title" htmlFor="note-title" error={errors.title}>
          <input id="note-title" name="title" data-autofocus className={inputClass} {...fieldAria("note-title", errors.title)} />
        </Field>
        <Field label="Text" htmlFor="note-body" error={errors.body}>
          <textarea id="note-body" name="body" rows={8} className={textareaClass} {...fieldAria("note-body", errors.body)} />
        </Field>
        <ResultLine state={state.result === "error" ? state : { ...state, result: "idle" }} />
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className={pillClass("tinted", "justify-center")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={pillClass("on", "justify-center")}>
            {pending ? "Saving…" : "Add note"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function DeleteSourceDialog({
  source,
  onClose,
  onDeleted,
}: {
  source: KnowledgeSource | null
  onClose: () => void
  onDeleted: (message: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog
      open={source !== null}
      onClose={() => {
        setError(null)
        onClose()
      }}
      busy={pending}
      title={source?.kind === "note" ? "Delete this note?" : "Delete this file?"}
      description={source ? `"${source.title}" is removed for good, and the AI will not use it. This cannot be undone.` : undefined}
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <button type="button" onClick={onClose} disabled={pending} className={pillClass("tinted", "justify-center")}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          className={dangerButtonClass}
          onClick={() => {
            if (!source) return
            startTransition(async () => {
              const result = await deleteKnowledgeSource(source.id)
              if (result.ok) {
                setError(null)
                onDeleted(`"${source.title}" deleted.`)
              } else setError(result.message)
            })
          }}
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
