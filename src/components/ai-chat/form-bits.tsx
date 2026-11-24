"use client"

import { startTransition, useActionState, type FormEvent } from "react"
import type { FormResult } from "@/app/(app)/ai-chat/actions"
import { inputClass } from "@/components/ui/field"
import { pillClass } from "@/components/ui/pill"
import { cn } from "@/lib/cn"

export const INITIAL: FormResult = { result: "idle", message: "", fieldErrors: {} }

// Submits through onSubmit instead of <form action>, so React does not reset
// the fields after a save: a failed save keeps what the user typed.
export function useSettingsForm(
  action: (prev: FormResult, form: FormData) => Promise<FormResult>,
  onSaved?: (state: FormResult) => void,
) {
  const [state, dispatch, pending] = useActionState(async (prev: FormResult, form: FormData) => {
    const next = await action(prev, form)
    if (next.result === "saved") onSaved?.(next)
    return next
  }, INITIAL)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    startTransition(() => dispatch(form))
  }
  return { state, pending, onSubmit, errors: state.fieldErrors }
}

export const textareaClass = cn(inputClass, "min-h-24 py-2.5 leading-6")
export const checkboxClass = "mt-0.5 size-5 shrink-0 accent-ink disabled:opacity-50"

/** The line next to a card's Save button: green when saved, a pink box when not. */
export function ResultLine({ state }: { state: FormResult }) {
  if (state.result === "error") {
    return (
      <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
        {state.message}
      </p>
    )
  }
  return (
    <p role="status" aria-live="polite" className="text-[13px] text-positive empty:hidden">
      {state.result === "saved" ? state.message : ""}
    </p>
  )
}

export function SaveRow({ state, pending, label }: { state: FormResult; pending: boolean; label: string }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <ResultLine state={state} />
      <button type="submit" disabled={pending} className={pillClass("on", "justify-center sm:ml-auto")}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  )
}
