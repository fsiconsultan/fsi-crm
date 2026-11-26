import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import type { ModeKind } from "./format"

type Tone = "neutral" | "warning" | "negative"

const tones: Record<Tone, string> = {
  neutral: "border border-line bg-surface text-ink",
  warning: "bg-warning-soft text-warning",
  negative: "bg-negative-soft text-negative",
}

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

const modes: Record<ModeKind, { label: string; tone: Tone }> = {
  bot: { label: "AI", tone: "neutral" },
  staff: { label: "Staff", tone: "neutral" },
  waiting: { label: "Waiting for staff", tone: "warning" },
}

export function ModeChip({ kind }: { kind: ModeKind }) {
  return <Chip tone={modes[kind].tone}>{modes[kind].label}</Chip>
}
