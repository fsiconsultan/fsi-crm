"use client"

import { useState } from "react"
import { FileText, MoreHorizontal, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Card, CardHeader } from "@/components/ui/card"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { cardMenuButtonClass, pillClass } from "@/components/ui/pill"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import {
  DOCUMENT_BUCKET,
  SIGNED_URL_SECONDS,
  formatFileSize,
  isImageDocument,
  listDocuments,
  type CustomerDocument,
  type DocumentList,
} from "@/lib/data/documents"
import { createClient } from "@/lib/supabase/client"
import { DeleteDocumentDialog, WRONG_PATH } from "./delete-document-dialog"
import { formatDate } from "./format"
import { UploadDialog } from "./upload-dialog"

type Notice = { ok: boolean; text: string }

const noticeTone = { ok: "text-positive", failed: "rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-ink" } as const

/** "Documents": the customer's files (PDFs, and meter photos sent from the website), newest first, with open, delete and upload. */
export function DocumentsPanel({ customerId, initial }: { customerId: number; initial: DocumentList }) {
  // null while the list reloads.
  const [list, setList] = useState<DocumentList | null>(initial)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [toDelete, setToDelete] = useState<CustomerDocument | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ doc: CustomerDocument; url: string } | null>(null)

  const reload = async () => {
    setList(null)
    setList(await listDocuments(createClient(), customerId))
  }

  async function onOpen(doc: CustomerDocument) {
    setNotice(null)
    if (!doc.file_path.startsWith(`${customerId}/`)) {
      return setNotice({ ok: false, text: `"${doc.file_name}" was not opened: ${WRONG_PATH}` })
    }
    if (isImageDocument(doc)) return openPreview(doc)
    // Opened before the request so the browser treats it as a user-initiated tab.
    const tab = window.open("", "_blank")
    const { data, error } = await createClient().storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.file_path, SIGNED_URL_SECONDS)

    if (error || !data?.signedUrl) {
      tab?.close()
      return setNotice({
        ok: false,
        text: `"${doc.file_name}" could not be opened: ${error?.message ?? "no link was returned"}. The file may be missing from storage; try again or upload it again.`,
      })
    }
    if (tab) {
      tab.opener = null
      tab.location.href = data.signedUrl
    } else {
      setNotice({ ok: false, text: "Your browser blocked the new tab. Allow pop-ups for this site and open the document again." })
    }
  }

  // A photo opens in a viewer on this page instead of a new tab.
  async function openPreview(doc: CustomerDocument) {
    const { data, error } = await createClient().storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.file_path, SIGNED_URL_SECONDS)
    if (error || !data?.signedUrl) {
      return setNotice({
        ok: false,
        text: `"${doc.file_name}" could not be opened: ${error?.message ?? "no link was returned"}. The file may be missing from storage; try again.`,
      })
    }
    setPreview({ doc, url: data.signedUrl })
  }

  const count = list?.ok ? list.documents.length : null

  return (
    <Card className="max-md:p-4">
      <CardHeader
        title="Documents"
        meta={count === null ? "Files for this customer" : `${count} ${count === 1 ? "file" : "files"}, visible to this customer's team`}
        action={
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              setUploading(true)
            }}
            className={pillClass("tinted")}
          >
            <Upload aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Upload PDF
          </button>
        }
      />

      <DocumentsBody
        list={list}
        onReload={reload}
        onOpen={onOpen}
        onDelete={(doc) => {
          setNotice(null)
          setToDelete(doc)
        }}
      />

      <div aria-live="polite">
        {notice ? (
          <p role={notice.ok ? "status" : "alert"} className={`mt-3 text-sm ${noticeTone[notice.ok ? "ok" : "failed"]}`}>
            {notice.text}
          </p>
        ) : null}
      </div>

      <PhotoViewer preview={preview} onClose={() => setPreview(null)} />
      <UploadDialog
        customerId={customerId}
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={(fileName) => {
          setUploading(false)
          setNotice({ ok: true, text: `"${fileName}" was uploaded.` })
          reload()
        }}
      />
      <DeleteDocumentDialog
        customerId={customerId}
        target={toDelete}
        onClose={() => setToDelete(null)}
        onChanged={reload}
        onDeleted={(doc) => {
          setToDelete(null)
          setNotice({ ok: true, text: `"${doc.file_name}" was deleted.` })
          reload()
        }}
      />
    </Card>
  )
}

function DocumentsBody({
  list,
  onReload,
  onOpen,
  onDelete,
}: {
  list: DocumentList | null
  onReload: () => void
  onOpen: (doc: CustomerDocument) => void
  onDelete: (doc: CustomerDocument) => void
}) {
  if (!list) return <LoadingState label="Loading documents…" />
  if (!list.ok) {
    return (
      <ErrorState
        title="The documents could not be loaded"
        detail={`The server answered: ${list.message}. Nothing was changed.`}
        action={<Button onClick={onReload}>Load again</Button>}
      />
    )
  }
  if (list.documents.length === 0) {
    return (
      <EmptyState
        title="No documents for this customer yet"
        detail="Use Upload PDF to add the quotation, proposal or company profile, so the whole team finds it here."
      />
    )
  }
  return (
    <ul className="-mt-1 divide-y divide-line">
      {list.documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
            <FileText aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium">{doc.file_name}</p>
            <p className="text-xs tabular-nums text-muted">
              {doc.document_type} · {formatFileSize(doc.file_size)} · {formatDate(doc.uploaded_at) ?? "Date unknown"}
            </p>
          </div>
          <button type="button" onClick={() => onOpen(doc)} className={pillClass("tinted", "h-11 px-3 md:h-9")}>
            Open<span className="sr-only"> {doc.file_name} {isImageDocument(doc) ? "(shows the photo here)" : "(opens in a new tab)"}</span>
          </button>
          <Menu
            label={`Actions for ${doc.file_name}`}
            triggerLabel={`More actions for ${doc.file_name}`}
            triggerClassName={cardMenuButtonClass}
            trigger={<MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />}
            placement="below-end"
          >
            {(close) => (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close()
                  onDelete(doc)
                }}
                className={menuItemClass}
              >
                <span className="flex items-center gap-3 text-negative">
                  <Trash2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                  Delete document…
                </span>
              </button>
            )}
          </Menu>
        </li>
      ))}
    </ul>
  )
}

// The photo at full card width, kept inside the screen height. Browsers that
// cannot draw the format (HEIC outside Safari) get a message and the download link.
function PhotoViewer({ preview, onClose }: { preview: { doc: CustomerDocument; url: string } | null; onClose: () => void }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const doc = preview?.doc
  const failed = preview !== null && failedUrl === preview.url
  return (
    <Dialog
      open={preview !== null}
      onClose={onClose}
      title={doc?.file_name ?? "Photo"}
      description={doc ? `${doc.document_type} · ${formatFileSize(doc.file_size)} · ${formatDate(doc.uploaded_at) ?? "Date unknown"}` : undefined}
    >
      {preview ? (
        failed ? (
          <p className="rounded-[12px] bg-surface-sunken p-4 text-sm">
            This browser cannot show this photo format. Use Open in new tab to download it and view it on your device.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed Storage URL; next/image would cache and proxy it
          <img
            src={preview.url}
            alt={doc?.document_type === "Meter Photo" ? "PLN meter photo sent with the website quote request" : (doc?.file_name ?? "")}
            onError={() => setFailedUrl(preview.url)}
            className="max-h-[65dvh] w-full rounded-[12px] border border-line bg-surface-sunken object-contain"
          />
        )
      ) : null}
      <DialogFooter>
        {preview ? (
          <a href={preview.url} target="_blank" rel="noopener noreferrer" className={pillClass("tinted", "h-11 px-4 md:h-9")}>
            Open in new tab
          </a>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  )
}
