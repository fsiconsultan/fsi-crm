"use client"

import { useActionState, useLayoutEffect, useRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { login, type LoginState } from "./actions"

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted"

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {
    error: initialError,
    username: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const selection = useRef<[number | null, number | null]>([null, null])

  // Switching the input type moves the caret to the end in some browsers, so
  // put the caret back where it was while the field still has focus.
  useLayoutEffect(() => {
    const input = passwordRef.current
    const [start, end] = selection.current
    if (input && document.activeElement === input && start !== null && end !== null) {
      input.setSelectionRange(start, end)
    }
  }, [showPassword])

  function togglePassword() {
    const input = passwordRef.current
    selection.current = [input?.selectionStart ?? null, input?.selectionEnd ?? null]
    setShowPassword((shown) => !shown)
  }

  function submit(formData: FormData) {
    setShowPassword(false)
    action(formData)
  }

  return (
    <form action={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          defaultValue={state.username}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "login-error" : undefined}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={togglePassword}
            // A mouse or touch press keeps focus (and the caret) in the field.
            // A keyboard press keeps focus on this button so the new state is announced.
            onPointerDown={(event) => event.preventDefault()}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors duration-150 hover:text-ink focus-visible:outline-offset-[-4px]"
          >
            {showPassword ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
        </div>
      </div>

      {state.error ? (
        <p id="login-error" role="alert" className="text-sm text-negative">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="mt-2 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
