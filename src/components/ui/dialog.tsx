"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

// Modal on the native <dialog>: the browser traps focus, closes on Escape and
// returns focus to the control that opened it. The shadow is the one allowed
// elevation in DESIGN.md (dialogs float above the page).
// On a phone it is a bottom sheet: full width, anchored to the bottom edge so
// the fields and buttons sit under the thumb.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal focuses the first control (Close); a dialog can mark a better start.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50 max-sm:mb-0 max-sm:max-h-[calc(100dvh-24px)] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
    >
      {open ? (
        <div className="p-5 md:p-6">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[17px] font-medium leading-6">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 hover:bg-surface-sunken"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Close</span>
            </button>
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}

// Action row for a dialog. It stays pinned to the bottom of the sheet while a
// long form scrolls, and clears the home indicator on phones.
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-sm:[&>*]:flex-1 md:-mx-6 md:-mb-6 md:px-6 md:pb-6">
      {children}
    </div>
  )
}
