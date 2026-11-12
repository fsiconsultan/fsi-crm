"use client"

import { useActionState, useId, useRef } from "react"
import { assignConversation, type ActionState } from "@/app/(app)/inbox/actions"
import { Button } from "@/components/ui/button"
import type { Assignee } from "@/lib/whatsapp/inbox"
import { FormError } from "./form-error"

const INITIAL: ActionState = { error: null }

function AssigneeRow({ id, name, current, disabled }: { id: string; name: string; current: boolean; disabled: boolean }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="submit"
        name="salesId"
        value={id}
        disabled={disabled}
        aria-current={current ? "true" : undefined}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left text-base text-ink transition-colors duration-[120ms] hover:bg-surface-sunken focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      >
        <span className="min-w-0 break-words">{name}</span>
        {current ? <span className="shrink-0 text-[13px] text-muted">Current</span> : null}
      </button>
    </li>
  )
}

// A native modal dialog: Escape closes it and the browser returns focus to the Assign button.
// On phones it is a bottom sheet of full-width rows; from md it is centered.
export function AssignDialog({
  conversationId,
  assignedSalesId,
  assignees,
}: {
  conversationId: string
  assignedSalesId: string | null
  assignees: Assignee[]
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await assignConversation(prev, formData)
    if (result.ok) dialog.current?.close()
    return result
  }, INITIAL)

  return (
    <>
      <Button onClick={() => dialog.current?.showModal()}>Assign</Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // Margins place it: Tailwind's reset removes the browser's centering margin.
        className="mx-0 mb-0 mt-auto w-full max-w-full overflow-hidden rounded-t-[var(--radius-card)] border border-line bg-surface text-ink shadow-xl md:m-auto md:max-w-sm md:rounded-[var(--radius-card)]"
      >
        <div className="flex max-h-[85dvh] flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between gap-3 border-b border-line py-2 pl-4 pr-2">
            <h2 id={titleId} className="text-[17px] font-medium leading-6">
              Assign conversation
            </h2>
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Close
            </Button>
          </div>
          <form action={formAction} className="flex min-h-0 flex-col">
            <input type="hidden" name="conversationId" value={conversationId} />
            <ul className="min-h-0 overflow-y-auto">
              <AssigneeRow id="" name="Unassigned" current={assignedSalesId === null} disabled={pending} />
              {assignees.map((assignee) => (
                <AssigneeRow
                  key={assignee.id}
                  id={assignee.id}
                  name={assignee.name}
                  current={assignee.id === assignedSalesId}
                  disabled={pending}
                />
              ))}
            </ul>
            <div className="flex flex-col gap-2 px-4 py-2 empty:hidden">
              {pending ? (
                <p role="status" className="text-sm text-muted">
                  Assigning...
                </p>
              ) : null}
              <FormError message={state.error} />
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
