"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"

// Native <dialog>: the browser traps focus, closes on Escape and returns focus
// to the control that opened it. The shadow marks it as floating above the page.
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
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
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 id={titleId} className="text-[17px] font-medium leading-6">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
