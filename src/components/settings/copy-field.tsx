"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

type CopyState = "idle" | "copied" | "failed"

const label: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed, select the text",
}

// A value staff paste into another system, with a copy button. The text stays
// selectable for browsers that block the clipboard.
export function CopyField({ title, value }: { title: string; value: string }) {
  const [state, setState] = useState<CopyState>("idle")

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  const Icon = state === "copied" ? Check : Copy

  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-xs text-muted">{title}</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-[var(--radius-control)] border border-line bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-ink">
          {value}
        </code>
        <Button onClick={copy} className="shrink-0 self-start sm:self-auto">
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          <span aria-live="polite">{label[state]}</span>
          <span className="sr-only"> {title}</span>
        </Button>
      </div>
    </section>
  )
}
