import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

/** Sizing and look of a text input or select, without a width. */
export const controlClass =
  "min-h-11 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted aria-[invalid=true]:border-negative md:min-h-10"

export const inputClass = `${controlClass} w-full`

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
