import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

// "screen": on a phone the thread fills the screen edge to edge, so the card frame starts at md.
const frames: Record<"card" | "screen", string> = {
  card: "rounded-[var(--radius-card)] border border-line",
  screen: "md:rounded-[var(--radius-card)] md:border md:border-line",
}

// Same surface as Card, without its padding: the list and the thread scroll inside.
export function Pane({
  frame = "card",
  className,
  children,
}: {
  frame?: "card" | "screen"
  className?: string
  children: ReactNode
}) {
  return <div className={cn("flex-col overflow-hidden bg-surface", frames[frame], className)}>{children}</div>
}
