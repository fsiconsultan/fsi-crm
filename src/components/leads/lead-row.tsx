import Link from "next/link"
import { MessageCircle, Phone } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { buttonClass } from "@/components/ui/button"
import type { Lead } from "@/lib/data/leads"
import { addedOn, displayPhone, leadName, nextStep, telHref, whatsappHref, type NextStep } from "./format"
import { RowMenu } from "./row-menu"
import { StatusChip } from "./status-chip"

export type LeadItemProps = {
  lead: Lead
  /** Salesperson name; only passed for Admin, who sees more than their own leads. */
  owner?: string
  editHref: string
  /** Admin only. */
  reassignHref: string | null
}

const nextTone: Record<NextStep["tone"], string> = {
  overdue: "font-medium text-negative",
  today: "font-medium text-ink",
  plain: "text-ink",
  quiet: "text-muted",
}

function NextStepText({ lead }: { lead: Lead }) {
  const step = nextStep(lead)
  return <span className={nextTone[step.tone]}>{step.text}</span>
}

function Place({ lead }: { lead: Lead }) {
  const place = [lead.business, lead.location].filter(Boolean).join(" · ")
  return place ? <p className="truncate text-[13px] text-muted">{place}</p> : null
}

function PartnerTag({ lead }: { lead: Lead }) {
  if (lead.lead_type !== "Partner") return null
  return <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink">Partner</span>
}

function Salesperson({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} photoUrl={null} size={28} />
      <span className="truncate">{name}</span>
    </span>
  )
}

// The name link stretches over the whole row or card (its ::after), so a tap
// anywhere opens the customer. Phone links and the "…" menu are `relative` and
// come later in the page, so they sit above it and keep their own action.
const stretchedLink =
  "after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-offset-4"

const tableCell = "px-3 py-2 align-middle"

/** One lead as a table row, from the xl breakpoint up. */
export function LeadTableRow({ lead, owner, editHref, reassignHref }: LeadItemProps) {
  const name = leadName(lead.customer_name)
  const phone = displayPhone(lead.phone)
  const tel = telHref(lead.phone)
  const whatsapp = whatsappHref(lead.phone)

  return (
    <tr className="relative h-14 border-t border-line transition-colors duration-[120ms] hover:bg-surface-sunken">
      <td className={`${tableCell} max-w-0 pl-2`}>
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/customers/${lead.id}`} className={`truncate text-sm font-medium text-ink ${stretchedLink}`}>
            {name}
          </Link>
          <PartnerTag lead={lead} />
        </div>
        <Place lead={lead} />
      </td>
      <td className={tableCell}>
        <PhoneCell phone={phone} tel={tel} whatsapp={whatsapp} name={name} />
      </td>
      <td className={tableCell}>
        <StatusChip status={lead.status} />
      </td>
      {owner !== undefined ? (
        <td className={`${tableCell} max-w-0 text-[13px]`}>
          <Salesperson name={owner} />
        </td>
      ) : null}
      <td className={`${tableCell} text-[13px] tabular-nums`}>
        <NextStepText lead={lead} />
      </td>
      <td className={`${tableCell} whitespace-nowrap text-[13px] tabular-nums text-muted`}>{addedOn(lead.created_at)}</td>
      <td className={`${tableCell} pr-2 text-right`}>
        <div className="relative inline-flex">
          <RowMenu
            leadId={lead.id}
            leadName={name}
            status={lead.status}
            editHref={editHref}
            reassignHref={reassignHref}
          />
        </div>
      </td>
    </tr>
  )
}

function PhoneCell({
  phone,
  tel,
  whatsapp,
  name,
}: {
  phone: ReturnType<typeof displayPhone>
  tel: string | null
  whatsapp: string | null
  name: string
}) {
  if (!phone) return <span className="text-[13px] text-muted">No phone</span>
  if (!tel || !whatsapp) return <span className="text-[13px] text-muted">{phone.text}</span>
  return (
    <span className="flex items-center gap-1">
      <a
        href={tel}
        aria-label={`Call ${name}, ${phone.text}`}
        className="relative whitespace-nowrap rounded-[6px] text-[13px] tabular-nums text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
      >
        {phone.text}
      </a>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label={`Message ${name} on WhatsApp`}
        title="WhatsApp"
        className="relative flex size-8 items-center justify-center rounded-full text-muted transition-colors duration-[120ms] hover:bg-line hover:text-ink"
      >
        <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </a>
    </span>
  )
}

/** One lead as a card, below the xl breakpoint. */
export function LeadCard({ lead, owner, editHref, reassignHref }: LeadItemProps) {
  const name = leadName(lead.customer_name)
  const phone = displayPhone(lead.phone)
  const tel = telHref(lead.phone)
  const whatsapp = whatsappHref(lead.phone)

  return (
    <article className="relative flex h-full flex-col gap-2 rounded-[14px] border border-line bg-surface-raised p-3 transition-colors duration-[120ms] hover:bg-surface-sunken">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <h2 className="min-w-0 text-[15px] font-medium leading-snug">
          <Link href={`/customers/${lead.id}`} className={`line-clamp-2 break-words ${stretchedLink}`}>
            {name}
          </Link>
        </h2>
        <StatusChip status={lead.status} />
      </div>

      <div className="min-w-0 text-[13px]">
        <div className="flex min-w-0 items-center gap-2">
          <PartnerTag lead={lead} />
          <div className="min-w-0 flex-1">
            <Place lead={lead} />
          </div>
        </div>
        {owner !== undefined ? (
          <p className="mt-1 truncate text-muted">
            Salesperson: <span className="text-ink">{owner}</span>
          </p>
        ) : null}
        <p className="mt-1 tabular-nums">
          <NextStepText lead={lead} />
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <CardPhoneActions phone={phone} tel={tel} whatsapp={whatsapp} name={name} />
        <div className="relative ml-auto">
          <RowMenu
            leadId={lead.id}
            leadName={name}
            status={lead.status}
            editHref={editHref}
            reassignHref={reassignHref}
          />
        </div>
      </div>
    </article>
  )
}

function CardPhoneActions({
  phone,
  tel,
  whatsapp,
  name,
}: {
  phone: ReturnType<typeof displayPhone>
  tel: string | null
  whatsapp: string | null
  name: string
}) {
  if (!phone) return <span className="text-[13px] text-muted">No phone number</span>
  if (!tel || !whatsapp) return <span className="min-w-0 truncate text-[13px] text-muted">{phone.text}</span>
  return (
    <>
      <a
        href={tel}
        aria-label={`Call ${name}, ${phone.text}`}
        title={phone.text}
        className={buttonClass("secondary", "relative min-h-11 px-3")}
      >
        <Phone aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        Call
      </a>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label={`Message ${name} on WhatsApp`}
        className={buttonClass("secondary", "relative min-h-11 px-3")}
      >
        <MessageCircle aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        WhatsApp
      </a>
    </>
  )
}
