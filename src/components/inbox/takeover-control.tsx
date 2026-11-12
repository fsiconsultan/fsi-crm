"use client"

import { useActionState, type ReactNode } from "react"
import { handBack, takeOver, type ActionState } from "@/app/(app)/inbox/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { FormError } from "./form-error"

const INITIAL: ActionState = { error: null }

const noteTone: Record<"confirmed" | "idle", string> = {
  confirmed: "font-medium text-ink",
  idle: "text-muted",
}

// Confirm only what the server state agrees with: someone else may have changed it since.
function confirm(input: { human: boolean; takenOverByViewer: boolean; took: boolean; gave: boolean }) {
  if (input.human && input.took && input.takenOverByViewer) return "You took over. The AI is paused."
  if (!input.human && input.gave) return "Handed back. The AI is answering again."
  return null
}

// One tap switches who answers. Both actions live here so the confirmation of the
// first survives the re-render that swaps the button for the second.
export function TakeoverControl({
  conversationId,
  human,
  takenOverByViewer,
  idleNote,
  children,
}: {
  conversationId: string
  human: boolean
  takenOverByViewer: boolean
  idleNote: string
  children?: ReactNode
}) {
  const [took, takeAction, taking] = useActionState(takeOver, INITIAL)
  const [gave, giveAction, giving] = useActionState(handBack, INITIAL)

  const confirmation = confirm({ human, takenOverByViewer, took: !!took.ok, gave: !!gave.ok })
  const form = human
    ? { action: giveAction, pending: giving, label: "Hand back to AI", busy: "Handing back...", variant: "secondary" as const }
    : { action: takeAction, pending: taking, label: "Take over", busy: "Taking over...", variant: "primary" as const }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p role="status" className={cn("text-[13px]", noteTone[confirmation ? "confirmed" : "idle"])}>
        {confirmation ?? idleNote}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={form.action}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <Button type="submit" variant={form.variant} disabled={form.pending}>
            {form.pending ? form.busy : form.label}
          </Button>
        </form>
        {children}
      </div>
      <FormError message={human ? gave.error : took.error} />
    </div>
  )
}
