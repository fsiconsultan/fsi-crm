// Progress toward a target. Solid fill = progress so far, tick = target.
// (Name kept so imports stay stable; progress bars are solid per the owner, 2026-11-13.)
export function HatchBar({
  value,
  max,
  target,
  label,
}: {
  value: number
  max: number
  target?: number
  label: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const targetPct = target !== undefined && max > 0 ? Math.min(100, (target / max) * 100) : null

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative h-3 w-full rounded-full bg-surface-sunken"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      {targetPct !== null ? (
        <div
          aria-hidden="true"
          className="absolute -top-1.5 h-6 w-0.5 rounded bg-ink"
          style={{ left: `${targetPct}%` }}
        />
      ) : null}
    </div>
  )
}
