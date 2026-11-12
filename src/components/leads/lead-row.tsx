import Link from "next/link"
import { Pencil } from "lucide-react"
import { buttonClass } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { Lead } from "@/lib/data/leads"
import { DeleteLeadButton } from "./delete-lead-button"
import { addedOn, dayCount, daysInStatus, followUp, leadName, whatsappHref } from "./format"
import { StatusSelect } from "./status-select"

// Column widths shared by the header and every row from the xl breakpoint up.
export const LEAD_GRID =
  "xl:grid-cols-[minmax(0,1fr)_160px_196px_136px_92px] xl:items-center xl:gap-x-4"

export function LeadRow({
  lead,
  owner,
  editHref,
}: {
  lead: Lead
  /** Salesperson name; only passed for Admin, who sees more than their own leads. */
  owner?: string
  editHref: string
}) {
  const name = leadName(lead.customer_name)
  const whatsapp = whatsappHref(lead.phone)
  const days = lead.status ? daysInStatus(lead.status_started_at) : null
  const next = followUp(lead.follow_up_date)
  const place = [lead.business, lead.location].filter(Boolean).join(" · ")

  return (
    <li className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-4 xl:py-2.5", LEAD_GRID)}>
      <div className="col-start-1 row-start-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/customers/${lead.id}`}
            className="inline-flex min-h-11 min-w-0 items-center rounded-[4px] text-sm font-medium hover:underline xl:min-h-0"
          >
            <span className="truncate">{name}</span>
          </Link>
          {lead.lead_type === "Partner" ? (
            <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-muted">Partner</span>
          ) : null}
        </div>
        {place ? <p className="truncate text-[13px] text-muted">{place}</p> : null}
      </div>

      <div className="col-span-2 min-w-0 text-sm xl:col-span-1">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label={`Message ${name} on WhatsApp, ${lead.phone}`}
            className="inline-flex min-h-11 items-center tabular-nums underline decoration-line underline-offset-4 hover:decoration-ink xl:min-h-0"
          >
            {lead.phone}
          </a>
        ) : (
          <span className="tabular-nums text-muted">{lead.phone || "No phone"}</span>
        )}
        {owner ? <p className="truncate text-[13px] text-muted">{owner}</p> : null}
      </div>

      <div className="col-span-2 max-w-[280px] xl:col-span-1">
        <StatusSelect key={`${lead.id}:${lead.status}`} leadId={lead.id} leadName={name} status={lead.status} />
      </div>

      <div className="col-span-2 text-[13px] xl:col-span-1">
        <p className="tabular-nums text-ink">
          {days !== null ? `${dayCount(days)} in status` : `Added ${addedOn(lead.created_at)}`}
        </p>
        {next ? (
          <p className={next.overdue ? "font-medium text-negative" : "text-muted"}>
            {next.overdue ? `Follow-up was due ${next.label}` : `Follow up ${next.label}`}
          </p>
        ) : days !== null ? (
          <p className="text-muted">Added {addedOn(lead.created_at)}</p>
        ) : null}
      </div>

      <div className="col-start-2 row-start-1 flex items-start justify-end gap-1 xl:col-start-auto xl:row-start-auto xl:items-center">
        <Link href={editHref} className={buttonClass("ghost", "w-11 px-0 text-muted hover:text-ink md:w-10")}>
          <Pencil aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          <span className="sr-only">Edit {name}</span>
        </Link>
        <DeleteLeadButton leadId={lead.id} leadName={name} />
      </div>
    </li>
  )
}
