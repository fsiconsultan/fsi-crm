import Link from "next/link"
import { FileText, MessageCircle, Phone } from "lucide-react"
import { StatusChip } from "@/components/leads/status-chip"
import { Avatar } from "@/components/ui/avatar"
import type { CustomerListRow } from "@/lib/data/customers"
import { customerName, personName, readablePhone, telUrl, whatsappUrl } from "./format"

// A contact book, not a work queue (that is /leads): who the person is, how to
// reach them, who looks after them and where they stand. A tap anywhere on a
// row opens the profile; the call and WhatsApp buttons sit above that link.

// The name link stretches over the whole row or card (its ::after). The
// contact buttons are `relative` and come later in the DOM, so they stay on top.
const stretchedLink =
  "after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-offset-4"

const DESKTOP_COLUMNS = "grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_150px_44px]"
const ADMIN_COLUMNS = "grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_150px_44px]"

const columnsFor = { admin: ADMIN_COLUMNS, other: DESKTOP_COLUMNS } as const

const iconButton =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-ink transition-colors duration-[120ms] hover:bg-surface-sunken"

const phoneTone = { readable: "text-ink", raw: "text-muted" } as const

function place(row: CustomerListRow) {
  return [row.business?.trim(), row.location?.trim()].filter(Boolean).join(" · ")
}

function PartnerTag({ type }: { type: string | null }) {
  if (type !== "Partner") return null
  return <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink">Partner</span>
}

function DocumentCount({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-[13px] tabular-nums text-muted">
      <FileText aria-hidden="true" className="size-4" strokeWidth={1.75} />
      {count}
      <span className="sr-only">{count === 1 ? " document" : " documents"}</span>
    </span>
  )
}

function NameBlock({ row }: { row: CustomerListRow }) {
  const name = customerName(row.customer_name)
  const where = place(row)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} photoUrl={null} size={36} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/customers/${row.id}`} className={`truncate text-sm font-medium text-ink ${stretchedLink}`}>
            {name}
          </Link>
          <PartnerTag type={row.lead_type} />
        </div>
        {where ? <p className="truncate text-[13px] text-muted">{where}</p> : null}
      </div>
    </div>
  )
}

function DesktopRow({ row, admin }: { row: CustomerListRow; admin: boolean }) {
  const name = customerName(row.customer_name)
  const phone = readablePhone(row.phone)
  const call = telUrl(row.phone)
  const whatsapp = whatsappUrl(row.phone)
  const owner = personName(row.salesperson)

  return (
    <li
      className={`relative grid min-h-16 items-center gap-4 rounded-[12px] px-3 py-2.5 transition-colors duration-[120ms] hover:bg-surface-sunken ${columnsFor[admin ? "admin" : "other"]}`}
    >
      <NameBlock row={row} />
      <div className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-sm tabular-nums ${phoneTone[phone?.readable ? "readable" : "raw"]}`}>
          <span className="sr-only">Phone: </span>
          {phone?.text ?? "No phone"}
        </span>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={iconButton}>
            <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
            <span className="sr-only">WhatsApp {name} (opens in a new tab)</span>
          </a>
        ) : null}
        {call ? (
          <a href={call} className={iconButton}>
            <Phone aria-hidden="true" className="size-4" strokeWidth={1.75} />
            <span className="sr-only">Call {name}</span>
          </a>
        ) : null}
      </div>
      {admin ? (
        <span className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="sr-only">Salesperson: </span>
          {owner ? <Avatar name={owner} photoUrl={null} size={24} /> : null}
          <span className="truncate">{owner ?? <span className="text-muted">Unassigned</span>}</span>
        </span>
      ) : null}
      <span className="min-w-0">
        <StatusChip status={row.status} />
      </span>
      <span className="justify-self-end">
        <DocumentCount count={row.documentCount} />
      </span>
    </li>
  )
}

const contactButton =
  "relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface-raised text-sm font-medium text-ink transition-colors duration-[120ms] active:bg-surface-sunken"

function PhoneCard({ row }: { row: CustomerListRow }) {
  const name = customerName(row.customer_name)
  const call = telUrl(row.phone)
  const whatsapp = whatsappUrl(row.phone)
  const where = place(row)

  return (
    <li className="relative flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/customers/${row.id}`} className={`min-w-0 break-words text-[15px] font-medium text-ink ${stretchedLink}`}>
            {name}
          </Link>
          <PartnerTag type={row.lead_type} />
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <DocumentCount count={row.documentCount} />
          <StatusChip status={row.status} />
        </span>
      </div>
      {where ? <p className="-mt-2 break-words text-[13px] text-muted">{where}</p> : null}
      {call || whatsapp ? (
        <div className="flex gap-2">
          {call ? (
            <a href={call} className={contactButton}>
              <Phone aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Call<span className="sr-only"> {name}</span>
            </a>
          ) : null}
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={contactButton}>
              <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
              WhatsApp<span className="sr-only"> {name} (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-[13px] text-muted">No phone number saved</p>
      )}
    </li>
  )
}

export function CustomerList({ rows, admin }: { rows: CustomerListRow[]; admin: boolean }) {
  return (
    <>
      <div className="max-md:hidden">
        <div
          aria-hidden="true"
          className={`grid gap-4 border-b border-line px-3 pb-2 text-xs text-muted ${columnsFor[admin ? "admin" : "other"]}`}
        >
          <span>Name</span>
          <span>Phone</span>
          {admin ? <span>Salesperson</span> : null}
          <span>Status</span>
          <span className="justify-self-end">Files</span>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {rows.map((row) => (
            <DesktopRow key={row.id} row={row} admin={admin} />
          ))}
        </ul>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <PhoneCard key={row.id} row={row} />
        ))}
      </ul>
    </>
  )
}
