"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import type { ActionResult } from "@/app/(app)/leads/actions"
import { cn } from "@/lib/cn"

const FeedbackContext = createContext<(result: ActionResult) => void>(() => {})

export function useLeadFeedback() {
  return useContext(FeedbackContext)
}

// Row actions (status change, delete) report here, above the list, so the
// message survives the row re-rendering or disappearing.
export function LeadsFeedback({
  initial,
  children,
}: {
  initial: ActionResult | null
  children: ReactNode
}) {
  const [result, setResult] = useState<ActionResult | null>(initial)

  return (
    <FeedbackContext value={setResult}>
      <div aria-live="polite">
        {result ? (
          <div
            role={result.ok ? "status" : "alert"}
            className={cn(
              "mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-control)] py-1 pl-4 pr-1 text-sm",
              result.ok ? "bg-positive-soft text-ink" : "bg-negative-soft text-ink",
            )}
          >
            <p className="py-2">
              <span className={cn("font-medium", !result.ok && "text-negative")}>
                {result.ok ? "Done. " : "Failed. "}
              </span>
              {result.message}
            </p>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] hover:bg-surface md:size-10"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Dismiss message</span>
            </button>
          </div>
        ) : null}
      </div>
      {children}
    </FeedbackContext>
  )
}
