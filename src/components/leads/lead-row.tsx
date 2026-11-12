import Link from "next/link"
import { MessageCircle, Pencil, Phone } from "lucide-react"
import { buttonClass } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { Lead } from "@/lib/data/leads"
import { DeleteLeadButton } from "./delete-lead-button"
import { addedOn, dayCount, daysInStatus, followUp, leadName, telHref, whatsappHref } from "./format"
import { StatusSelect } from "./status-select"

// Column widths shared by the header and every row from the xl breakpoint up.
// Below it a lead is a card: name and actions, details, call and WhatsApp, status.
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
  const tel = telHref(lead.phone)
  const days = lead.status ? daysInStatus(lead.status_started_at) : null
  const next = followUp(lead.follow_up_date)
  const place = [lead.business, lead.location].filter(Boolean).join(" · ")

  return (
    // The name link stretches over the whole row; the controls sit above it.
    <li
      className={cn(
        "relative -mx-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 rounded-[var(--radius-control)] px-2 py-3 transition-colors duration-150 hover:bg-surface-sunken active:bg-surface-sunken xl:gap-y-2 xl:py-2.5",
        LEAD_GRID,
      )}
    >
      <div className="col-start-1 row-start-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/customers/${lead.id}`}
            className="inline-flex min-h-11 min-w-0 items-center text-base font-medium after:absolute after:inset-0 after:rounded-[var(--radius-control)] xl:min-h-0 xl:text-sm"
          >
            <span className="truncate">{name}</span>
          </Link>
          {lead.lead_type === "Partner" ? (
            <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-muted">Partner</span>
          ) : null}
        </div>
        {place ? <p className="truncate text-[13px] text-muted">{place}</p> : null}
        {owner ? <p className="truncate text-[13px] text-muted xl:hidden">Assigned to {owner}</p> : null}
      </div>

      <div className="col-span-2 min-w-0 text-sm max-xl:order-4 max-xl:mt-1 xl:col-span-1">
        {/* Phone: two thumb-sized buttons. */}
        <div className="flex gap-2 xl:hidden">
          {tel ? (
            <a
              href={tel}
              aria-label={`Call ${name}, ${lead.phone}`}
              className={buttonClass("secondary", "relative z-10 min-w-0 flex-1")}
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate tabular-nums">{lead.phone}</span>
            </a>
          ) : (
            <span className="flex min-h-11 flex-1 items-center text-muted">{lead.phone || "No phone number"}</span>
          )}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label={`Message ${name} on WhatsApp`}
              className={buttonClass("secondary", "relative z-10 shrink-0")}
            >
              <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
              WhatsApp
            </a>
          ) : null}
        </div>

        {/* Desktop: the number itself opens WhatsApp. */}
        <div className="hidden xl:block">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label={`Message ${name} on WhatsApp, ${lead.phone}`}
              className="relative z-10 tabular-nums underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              {lead.phone}
            </a>
          ) : (
            <span className="tabular-nums text-muted">{lead.phone || "No phone"}</span>
          )}
          {owner ? <p className="truncate text-[13px] text-muted">{owner}</p> : null}
        </div>
      </div>

      <div className="relative z-10 col-span-2 max-xl:order-5 xl:col-span-1">
        <StatusSelect key={`${lead.id}:${lead.status}`} leadId={lead.id} leadName={name} status={lead.status} />
      </div>

      <div className="col-span-2 text-[13px] max-xl:order-3 xl:col-span-1">
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

      <div className="relative z-10 col-start-2 row-start-1 flex items-start justify-end gap-1 xl:col-start-auto xl:row-start-auto xl:items-center">
        <Link href={editHref} className={buttonClass("ghost", "w-11 px-0 text-muted hover:text-ink md:w-10")}>
          <Pencil aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          <span className="sr-only">Edit {name}</span>
        </Link>
        <DeleteLeadButton leadId={lead.id} leadName={name} />
      </div>
    </li>
  )
}
