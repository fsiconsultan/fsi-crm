import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { IconCircle, type Tint } from "@/components/ui/icon-circle"
import { loadWidth } from "./team-model"

// Small pieces shared by the team list and a person's page.

type Tone = "active" | "inactive"

const openTone: Record<Tone, string> = {
  active: "bg-accent",
  inactive: "bg-muted/45",
}

/**
 * A person's load as a thin bar scaled to the largest load on the team, so one
 * very large load reads as the outlier it is. The grey length is every
 * lead assigned to them; the solid blue part from the left, drawn on top, is the share still open.
 * Decorative: the numbers beside it say the same.
 */
export function LoadBar({ open, total, scale, inactive }: { open: number; total: number; scale: number; inactive: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-full rounded-full bg-surface-sunken">
      <span className="absolute inset-y-0 left-0 rounded-full bg-muted/25" style={{ width: `${loadWidth(total, scale)}%` }} />
      <span
        className={`absolute inset-y-0 left-0 rounded-full ${openTone[inactive ? "inactive" : "active"]}`}
        style={{ width: `${loadWidth(open, scale)}%` }}
      />
    </span>
  )
}

/** The person's role as a quiet outline pill. */
export function RolePill({ role }: { role: string | null }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-line bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink">
      {role ?? "No role"}
    </span>
  )
}

/** Shown only for an inactive person: they cannot sign in. */
export function InactivePill() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium text-negative">
      Inactive
    </span>
  )
}

/**
 * One compact number card in the Overview KPI style: icon circle and title,
 * the number, one muted line. The whole card opens the list it counts.
 */
export function StatCard({
  icon,
  tint,
  title,
  value,
  meta,
  href,
  linkLabel,
}: {
  icon: LucideIcon
  tint: Tint
  title: string
  value: ReactNode
  meta: string
  href: string
  /** What opening the card shows, read by screen readers after the number. */
  linkLabel: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors duration-[120ms] hover:bg-surface-sunken md:p-5"
    >
      <span className="flex items-center gap-2.5">
        <IconCircle icon={icon} tint={tint} />
        <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight">{title}</span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted max-sm:hidden" />
      </span>
      <span className="text-[32px] font-normal leading-none tracking-[-0.04em] tabular-nums md:text-[44px]">
        {value}
      </span>
      <span className="text-xs text-muted">
        {meta}
        <span className="sr-only">. {linkLabel}</span>
      </span>
    </Link>
  )
}

// Three cards (no WhatsApp) fill the row on desktop; on a phone the odd one spans both columns.
const statColumns = {
  3: "grid grid-cols-2 gap-3 xl:grid-cols-3 [&>*:last-child]:max-xl:col-span-2",
  4: "grid grid-cols-2 gap-3 xl:grid-cols-4",
} as const

export function StatGrid({ count, children }: { count: 3 | 4; children: ReactNode }) {
  return <div className={statColumns[count]}>{children}</div>
}
