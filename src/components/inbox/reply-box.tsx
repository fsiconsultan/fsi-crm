"use client"

import { useActionState, useId, useState, type KeyboardEvent } from "react"
import { sendReply, type ActionState } from "@/app/(app)/inbox/actions"
import { Button } from "@/components/ui/button"
import { FormError } from "./form-error"
import { ReplyField } from "./reply-field"

const INITIAL: ActionState = { error: null }

export function ReplyBox({ conversationId }: { conversationId: string }) {
  // Controlled, so a failed send keeps the text; React resets uncontrolled fields after every action.
  const [body, setBody] = useState("")
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await sendReply(prev, formData)
    if (result.ok) setBody("")
    return result
  }, INITIAL)
  const fieldId = useId()

  function sendOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: Enter that confirms an IME candidate must not send.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <label htmlFor={fieldId} className="sr-only">
          Reply to the customer
        </label>
        <ReplyField
          id={fieldId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={sendOnEnter}
          placeholder="Write a reply"
          enterKeyHint="send"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Sending..." : "Send"}
        </Button>
      </div>
      <p className="hidden text-xs text-muted md:block">Enter sends. Shift and Enter starts a new line.</p>
      <FormError message={state.error} />
    </form>
  )
}
