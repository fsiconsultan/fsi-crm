"use client"

import { useEffect, useRef, type ReactNode } from "react"

// Keeps the newest message in view: jumps to the bottom on load and whenever scrollKey changes.
export function MessageLog({ scrollKey, children }: { scrollKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = ref.current
    if (log) log.scrollTop = log.scrollHeight
  }, [scrollKey])

  return (
    <div
      ref={ref}
      role="log"
      aria-label="Messages"
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6"
    >
      {children}
    </div>
  )
}
