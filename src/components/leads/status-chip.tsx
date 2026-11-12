import { cn } from "@/lib/cn"
import { LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"

// Green and pink tints only where they carry meaning: won and lost. The label
// stays ink because green text on the green tint misses AA at this size.
export function StatusChip({ status }: { status: string | null }) {
  const known = isLeadStatus(status)
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium",
        status === "Deal" && "bg-positive-soft text-ink",
        status === "No Deal" && "bg-negative-soft text-ink",
        status && status !== "Deal" && status !== "No Deal" && "bg-surface-sunken text-ink",
        !status && "border border-dashed border-line text-muted",
      )}
    >
      {known ? LEAD_STATUS_SHORT[status] : (status ?? NO_STATUS_LABEL)}
    </span>
  )
}
