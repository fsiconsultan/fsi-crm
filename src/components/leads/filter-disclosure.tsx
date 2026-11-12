"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { buttonClass } from "@/components/ui/button"
import { cn } from "@/lib/cn"

// On a phone the filters fold away under one button that says how many are
// set; from the md breakpoint they are always shown and the button is gone.
export function FilterDisclosure({
  activeCount,
  mobileExtra,
  children,
}: {
  activeCount: number
  /** Shown next to the toggle on phones, for example a "Clear filters" link. */
  mobileExtra?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="lead-filter-panel"
          onClick={() => setOpen(!open)}
          className={buttonClass("secondary")}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {open ? "Hide filters" : "Filters"}
          {activeCount > 0 ? (
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs tabular-nums text-ink-contrast">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          ) : null}
        </button>
        {mobileExtra}
      </div>
      <div id="lead-filter-panel" className={cn("flex-col gap-4 md:flex", open ? "flex" : "hidden")}>
        {children}
      </div>
    </>
  )
}
