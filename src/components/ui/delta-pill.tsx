type Direction = "up" | "down" | "flat"

const arrows: Record<Direction, { glyph: string; label: string; className: string }> = {
  up: { glyph: "▲", label: "Up", className: "text-positive" },
  down: { glyph: "▼", label: "Down", className: "text-negative" },
  flat: { glyph: "•", label: "No change", className: "text-muted" },
}

// A small white pill with a pink or green arrow, as in the reference. Shows a
// change against a named comparison period: render it only when both periods
// are real data (DESIGN.md, antislop R-17).
export function DeltaPill({ value, suffix = "" }: { value: number; suffix?: string }) {
  const direction: Direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  const arrow = arrows[direction]
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink tabular-nums">
      <span aria-hidden="true" className={`text-[9px] ${arrow.className}`}>
        {arrow.glyph}
      </span>
      <span className="sr-only">{arrow.label}</span>
      {Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  )
}
