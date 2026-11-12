import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

// The border is darker than `line` so the edge of an input keeps 3:1 against
// the card in both themes (WCAG 1.4.11).
export const inputClass =
  "min-h-11 w-full rounded-[var(--radius-control)] border border-[color-mix(in_srgb,var(--muted)_75%,transparent)] bg-surface px-3 text-sm text-ink placeholder:text-muted aria-[invalid=true]:border-negative disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted"

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// aria wiring for an input inside <Field>.
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const
}
