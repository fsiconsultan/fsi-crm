"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { login, type LoginState } from "./actions"

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted"

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {
    error: initialError,
    username: "",
  })

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className={inputClass}
        />
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
