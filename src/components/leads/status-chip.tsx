import { LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"

type Tone = "open" | "won" | "lost" | "none"

// Read-only status pill. Blue tint for a lead still moving through the
// pipeline, green and pink only where they carry meaning (won, lost), a quiet
// grey for no status. The label stays ink: coloured text on its own tint misses
// AA at 12px.
const tones: Record<Tone, string> = {
  open: "bg-accent-soft text-ink",
  won: "bg-positive-soft text-ink",
  lost: "bg-negative-soft text-ink",
  none: "bg-surface-sunken text-muted",
}

function toneOf(status: string | null): Tone {
  if (!status) return "none"
  if (status === "Deal") return "won"
  if (status === "No Deal") return "lost"
  return "open"
}

export function StatusChip({ status }: { status: string | null }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center truncate whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[toneOf(status)]}`}
    >
      {isLeadStatus(status) ? LEAD_STATUS_SHORT[status] : (status ?? NO_STATUS_LABEL)}
    </span>
  )
}
