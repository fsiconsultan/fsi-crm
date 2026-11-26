import type { ReactNode } from "react"

// Every data view needs these three (antislop R-27). Each one says what
// happened and what to do next, never just "No data".

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[var(--radius-control)] border border-dashed border-line px-5 py-8">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-prose text-sm text-muted">{detail}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-[var(--radius-control)] bg-negative-soft px-5 py-6"
    >
      <p className="text-sm font-medium text-negative">{title}</p>
      <p className="max-w-prose text-sm text-ink">{detail}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="py-6 text-sm text-muted">
      {label}
    </p>
  )
}
