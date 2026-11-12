import { cn } from "@/lib/cn"

// Shows a change against a named comparison period. Only render it when both
// periods are real data (DESIGN.md, antislop R-17).
export function DeltaPill({ value, suffix = "" }: { value: number; suffix?: string }) {
  const down = value < 0
  const flat = value === 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        flat && "bg-surface-sunken text-muted",
        !flat && down && "bg-negative-soft text-negative",
        !flat && !down && "bg-positive-soft text-positive",
      )}
    >
      <span aria-hidden="true">{flat ? "•" : down ? "▼" : "▲"}</span>
      <span className="sr-only">{flat ? "No change" : down ? "Down" : "Up"}</span>
      {Math.abs(value).toLocaleString("en-US")}
      {suffix}
    </span>
  )
}
