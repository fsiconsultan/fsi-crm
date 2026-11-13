import { cn } from "@/lib/cn"

type Tone = "tinted" | "raised"

const tones: Record<Tone, string> = {
  // Header pills (scope, export) and the date chip's outer pill: a grey step on the canvas.
  tinted: "bg-line/70 text-ink hover:bg-line",
  // The date chip's inner pill: white control on the tinted pill, as in the reference.
  raised: "bg-surface-raised text-ink shadow-xs hover:bg-surface-sunken",
}

// 40px pill controls of the page header (DESIGN.md "Page header controls"), 44px on phones.
export function pillClass(tone: Tone = "tinted", className?: string) {
  return cn(
    "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-60 md:h-10",
    tones[tone],
    className,
  )
}

// The 36px round "..." button in a card header.
export const cardMenuButtonClass =
  "flex size-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink transition-colors duration-[120ms] hover:bg-surface-sunken md:size-9"
