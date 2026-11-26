import type { LucideIcon } from "lucide-react"

export type Tint = "pink" | "amber" | "blue" | "grey"

// Tinted icon circles as in the reference: pink is overdue, amber is waiting
// too long, blue is a person waiting, grey is neutral or missing data.
const tints: Record<Tint, string> = {
  pink: "bg-negative-soft text-negative",
  amber: "bg-warning-soft text-warning",
  blue: "bg-accent-soft text-accent",
  grey: "bg-surface-sunken text-ink",
}

export function IconCircle({ icon: Icon, tint }: { icon: LucideIcon; tint: Tint }) {
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tints[tint]}`}>
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </span>
  )
}
