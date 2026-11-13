export type ConnectionStatus = "connected" | "not_tested" | "not_set_up" | "error" | "not_built"

// Ink text on a soft tint, as the lead status pill does: coloured text on its
// own tint misses AA at 12px. The word carries the meaning; the tint repeats it.
const tones: Record<ConnectionStatus, string> = {
  connected: "bg-positive-soft text-ink",
  not_tested: "border border-line bg-surface-raised text-ink",
  not_set_up: "bg-surface-sunken text-ink",
  error: "bg-negative-soft text-ink",
  not_built: "border border-dashed border-line text-muted",
}

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  not_tested: "Keys set, not tested",
  not_set_up: "Not set up",
  error: "Error",
  not_built: "Not built yet",
}

export function StatusPill({ status }: { status: ConnectionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
