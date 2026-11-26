"use client"

import { useActionState } from "react"
import { linkLead, resolveEvent, sendReengageTemplate, type ActionState } from "@/app/(app)/inbox/actions"
import { Button } from "@/components/ui/button"
import { FormError } from "./form-error"

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>
type Kind = "linkLead" | "resolveEvent" | "sendReengageTemplate"

const ACTIONS: Record<Kind, { action: Action; label: string; pending: string }> = {
  linkLead: { action: linkLead, label: "Link this customer", pending: "Linking..." },
  resolveEvent: { action: resolveEvent, label: "Mark reviewed", pending: "Saving..." },
  sendReengageTemplate: { action: sendReengageTemplate, label: "Send template", pending: "Sending template..." },
}

const INITIAL: ActionState = { error: null }

// One button that runs one inbox action and shows the action's own error under it.
export function ActionForm({
  kind,
  fields,
  label,
  variant = "secondary",
}: {
  kind: Kind
  fields: Record<string, string>
  label?: string
  variant?: "primary" | "secondary"
}) {
  const config = ACTIONS[kind]
  const [state, formAction, pending] = useActionState(config.action, INITIAL)

  return (
    <form action={formAction} className="flex min-w-0 flex-col items-start gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? config.pending : (label ?? config.label)}
      </Button>
      <FormError message={state.error} />
    </form>
  )
}
