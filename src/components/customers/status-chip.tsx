import { cn } from "@/lib/cn"
import { isLeadStatus, LEAD_STATUS_SHORT, NO_STATUS_LABEL } from "@/lib/leads/status"

// Color only carries meaning: green for a won deal, pink for a lost one,
// neutral for everything still in progress (DESIGN.md palette rule).
export function StatusChip({ status }: { status: string | null }) {
  const label = isLeadStatus(status) ? LEAD_STATUS_SHORT[status] : (status ?? NO_STATUS_LABEL)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "Deal" && "bg-positive-soft text-[color-mix(in_srgb,var(--positive)_80%,var(--ink))]",
        status === "No Deal" && "bg-negative-soft text-negative",
        status !== "Deal" && status !== "No Deal" && "bg-surface-sunken text-ink ring-1 ring-line",
      )}
    >
      {label}
    </span>
  )
}
