"use client"

import Image from "next/image"
import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { Camera, Trash2 } from "lucide-react"
import { setSalespersonPhoto } from "@/app/(app)/sales/actions"
import { Avatar } from "@/components/ui/avatar"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { pillClass } from "@/components/ui/pill"
import {
  PHOTO_ACCEPT,
  SALES_AVATAR_BUCKET,
  photoContentType,
  photoPath,
  uploadFailureMessage,
  validatePhoto,
} from "@/lib/sales/photo"
import { createClient } from "@/lib/supabase/client"
import { useOpener } from "./sales-forms"

export type PhotoPerson = { id: string; name: string; photoUrl: string | null }

/** "Change photo" pill for the person page header. */
export function ChangePhotoButton({ person }: { person: PhotoPerson }) {
  const opener = useOpener()
  return (
    <>
      <button type="button" onClick={opener.show} aria-label={`Change photo of ${person.name}`} className={pillClass("tinted")}>
        <Camera aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        Change photo
      </button>
      <PhotoDialog key={opener.session} person={person} open={opener.open} onClose={opener.close} onSaved={opener.done} />
      <p role="status" aria-live="polite" className="basis-full text-[13px] text-positive empty:hidden md:text-right">
        {opener.saved}
      </p>
    </>
  )
}

/**
 * A team list row's photo as the Change photo button (a small camera badge
 * marks it), with the person's name block beside it and the success line under the name.
 */
export function PersonPhoto({
  person,
  avatarClassName,
  children,
}: {
  person: PhotoPerson
  avatarClassName?: string
  children: ReactNode
}) {
  const opener = useOpener()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={opener.show}
        aria-label={`Change photo of ${person.name}`}
        className="relative -m-0.5 flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <Avatar name={person.name} photoUrl={person.photoUrl} className={avatarClassName} />
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-surface-raised text-ink ring-1 ring-line"
        >
          <Camera className="size-3" strokeWidth={2} />
        </span>
      </button>
      <div className="min-w-0">
        {children}
        <p role="status" aria-live="polite" className="mt-1 text-xs text-positive empty:hidden">
          {opener.saved}
        </p>
      </div>
      <PhotoDialog key={opener.session} person={person} open={opener.open} onClose={opener.close} onSaved={opener.done} />
    </div>
  )
}

type Phase =
  | { kind: "idle" }
  | { kind: "confirmRemove" }
  | { kind: "busy"; label: string }
  | { kind: "failed"; message: string }

const STOPPED = (reason: string) =>
  `The photo change stopped unexpectedly (${reason}). Reload the page to see whether the photo changed before trying again.`

/**
 * Pick a JPEG, PNG or WebP of at most 2 MB, see it in the circle, then Save photo:
 * the file goes to Storage as the signed-in Admin, then the server action saves
 * it on the profile (and takes the file back if that fails). Remove photo asks first.
 */
function PhotoDialog({
  person,
  open,
  onClose,
  onSaved,
}: {
  person: PhotoPerson
  open: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const formId = useId()
  const inputId = `${formId}-file`
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const working = useRef(false)
  // Set when Keep photo leads back from the confirm step, so focus lands on Remove photo again.
  const [backFromConfirm, setBackFromConfirm] = useState(false)
  const busy = phase.kind === "busy"
  const pickError = phase.kind === "failed" && !file ? phase.message : undefined

  function showPreview(next: string | null) {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(next)
  }

  function close() {
    if (busy) return
    showPreview(null)
    onClose()
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0] ?? null
    setFile(null)
    showPreview(null)
    setPhase({ kind: "idle" })
    if (!picked) return
    const invalid = await validatePhoto(picked)
    if (invalid) return setPhase({ kind: "failed", message: invalid })
    setFile(picked)
    showPreview(URL.createObjectURL(picked))
  }

  // One run at a time: the ref is set before the first await, so a second tap cannot start another.
  async function guarded(run: () => Promise<void>) {
    if (working.current) return
    working.current = true
    try {
      await run()
    } catch (error) {
      setPhase({ kind: "failed", message: STOPPED(error instanceof Error ? error.message : "unknown error") })
    } finally {
      working.current = false
    }
  }

  async function save() {
    if (!file) return setPhase({ kind: "failed", message: "Choose a photo first." })
    const invalid = await validatePhoto(file)
    if (invalid) return setPhase({ kind: "failed", message: invalid })

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return setPhase({ kind: "failed", message: "Nothing was uploaded: your session has ended. Sign in again and retry." })
    }

    const contentType = await photoContentType(file)
    const path = photoPath(person.id, contentType)
    setPhase({ kind: "busy", label: "Uploading the photo…" })
    const { error } = await supabase.storage
      .from(SALES_AVATAR_BUCKET)
      .upload(path, file, { contentType, upsert: false, cacheControl: "31536000" })
    if (error) {
      const statusCode = "statusCode" in error && typeof error.statusCode === "string" ? error.statusCode : undefined
      return setPhase({ kind: "failed", message: uploadFailureMessage({ message: error.message, statusCode }) })
    }

    setPhase({ kind: "busy", label: "Photo uploaded. Saving it to the profile…" })
    const result = await setSalespersonPhoto(person.id, path)
    if (result.result === "error") return setPhase({ kind: "failed", message: result.message })
    showPreview(null)
    onSaved(result.message)
  }

  async function remove() {
    setPhase({ kind: "busy", label: "Removing the photo…" })
    const result = await setSalespersonPhoto(person.id, null)
    if (result.result === "error") return setPhase({ kind: "failed", message: result.message })
    onSaved(result.message)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void guarded(save)
  }

  if (phase.kind === "confirmRemove") {
    return (
      <Dialog
        open={open}
        onClose={close}
        title={`Remove ${person.name}'s photo?`}
        description="Their initials show instead, here, in the sidebar and on their leads. You can add a photo again at any time."
      >
        <DialogFooter>
          <button
            type="button"
            ref={focusOnMount}
            onClick={() => {
              setBackFromConfirm(true)
              setPhase({ kind: "idle" })
            }}
            className={pillClass("tinted", "justify-center")}
          >
            Keep photo
          </button>
          <button type="button" onClick={() => void guarded(remove)} className={pillClass("on", "justify-center")}>
            <Trash2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Remove photo
          </button>
        </DialogFooter>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={busy}
      dismissOnBackdrop={!file}
      title={`Change ${person.name}'s photo`}
      description="Shown in a circle on the team pages and in the sidebar, so a square photo of their face works best."
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-4">
        <div className="flex items-center gap-4">
          <PhotoPreview preview={preview} person={person} />
          <p className="min-w-0 text-sm text-muted">
            <PreviewCaption hasPreview={preview !== null} hasPhoto={person.photoUrl !== null} />
          </p>
        </div>
        <Field label="Photo" htmlFor={inputId} error={pickError} hint="JPEG, PNG or WebP, 2 MB at most.">
          <input
            id={inputId}
            data-autofocus
            name="photo"
            type="file"
            accept={PHOTO_ACCEPT}
            disabled={busy}
            onChange={onPick}
            className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-1 file:text-sm file:text-ink`}
            {...fieldAria(inputId, pickError, true)}
          />
        </Field>
        <div aria-live="polite">
          {busy ? <p className="text-[13px] text-muted">{phase.label}</p> : null}
        </div>
        {phase.kind === "failed" && file ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
            {phase.message}
          </p>
        ) : null}
        {pickError ? (
          <p role="alert" className="sr-only">
            {pickError}
          </p>
        ) : null}
      </form>
      <DialogFooter>
        {person.photoUrl ? (
          <button
            type="button"
            ref={backFromConfirm ? focusOnMount : undefined}
            onClick={() => setPhase({ kind: "confirmRemove" })}
            disabled={busy}
            className={pillClass("tinted", "justify-center sm:mr-auto")}
          >
            <Trash2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Remove photo
          </button>
        ) : null}
        <button type="button" onClick={close} disabled={busy} className={pillClass("tinted", "justify-center")}>
          Cancel
        </button>
        <button type="submit" form={formId} disabled={busy} className={pillClass("on", "justify-center")}>
          {busy ? "Saving…" : "Save photo"}
        </button>
      </DialogFooter>
    </Dialog>
  )
}

// The control that replaces the one just pressed takes focus, so keyboard users stay in the dialog.
function focusOnMount(element: HTMLButtonElement | null) {
  element?.focus()
}

function PhotoPreview({ preview, person }: { preview: string | null; person: PhotoPerson }) {
  if (preview) {
    return (
      <Image
        src={preview}
        alt=""
        width={96}
        height={96}
        unoptimized
        className="size-24 shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    )
  }
  return <Avatar name={person.name} photoUrl={person.photoUrl} size={96} />
}

function PreviewCaption({ hasPreview, hasPhoto }: { hasPreview: boolean; hasPhoto: boolean }) {
  if (hasPreview) return <>New photo, not saved yet. Save photo to use it.</>
  if (hasPhoto) return <>Their current photo.</>
  return <>No photo yet, so their initials are shown.</>
}
