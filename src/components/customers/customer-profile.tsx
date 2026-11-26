import { StatusChip } from "@/components/leads/status-chip"
import { groupSchedules } from "@/components/schedules/model"
import { ScheduleCard, type LeadScheduleData } from "@/components/schedules/schedule-card"
import { ScheduleProvider } from "@/components/schedules/schedule-provider"
import { PageHeader } from "@/components/shell/page-header"
import { Avatar } from "@/components/ui/avatar"
import { MapPin, MessageSquare, ReceiptText } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { IconCircle } from "@/components/ui/icon-circle"
import { pillClass } from "@/components/ui/pill"
import type { Customer, CustomerChat } from "@/lib/data/customers"
import type { DocumentList } from "@/lib/data/documents"
import { ChatCard } from "./chat-card"
import { DocumentsPanel } from "./documents-panel"
import type { SalesChoices } from "./edit-customer"
import { customerName, formatDateTime, personName, readablePhone, telUrl, whatsappUrl } from "./format"
import { ProfileActions } from "./profile-actions"
import { EditLink, ProfileNotice, ProfileProvider } from "./profile-context"
import { contactFields, type ContactKey } from "./profile-model"
import { noteBlocks, type NoteBlock } from "./notes-model"
import { quoteSubmittedAt, quoteView } from "./quote-model"
import { NextStepCard, StageCard } from "./stage-card"

const Dot = () => <span aria-hidden="true">·</span>

/**
 * One customer on one screen. The header answers "who, where do they stand,
 * who owns them"; the left column is the work (next step, stage, chat,
 * documents), the right column the reference details.
 */
export function CustomerProfile({
  customer,
  documents,
  chat,
  salesOptions,
  admin,
  viewerId,
  today,
  schedules,
  connections,
  now,
}: {
  customer: Customer
  documents: DocumentList
  chat: CustomerChat
  // null unless the viewer is an Admin, who may reassign the customer.
  salesOptions: SalesChoices
  admin: boolean
  viewerId: string
  today: string
  schedules: LeadScheduleData
  /** Whether the Google Calendar and email keys are set (never their values). */
  connections: { googleConnected: boolean; emailConnected: boolean }
  /** UTC ISO of this render. */
  now: string
}) {
  const { salesperson, ...lead } = customer
  const name = customerName(customer.customer_name)
  const owner = personName(salesperson)
  const place = [customer.business?.trim(), customer.location?.trim()].filter(Boolean)
  const scheduleReady = schedules.ok && schedules.setUp
  const nextSchedule = scheduleReady ? (groupSchedules(schedules.items, now).upcoming[0] ?? null) : null
  const owners = salesOptions?.ok
    ? Object.fromEntries(salesOptions.options.map((person) => [person.id, person.name ?? person.username ?? "Unnamed user"]))
    : null

  return (
    <ProfileProvider customer={lead} sales={salesOptions} currentSalesName={owner}>
      <ScheduleProvider
        lead={{ id: customer.id, name, location: customer.location, email: customer.email, salesId: customer.sales_id }}
        env={{ admin, today, ...connections }}
        sales={salesOptions}
        enabled={scheduleReady}
      >
        {/* Room for the phone's pinned action bar, so the last card is never under it. */}
        <div className="max-md:pb-20">
          <PageHeader
            title={name}
            meta={
              <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted">
                <StatusChip status={customer.status} />
                {place.map((part) => (
                  <span key={part} className="contents">
                    <Dot />
                    <span className="text-ink">{part}</span>
                  </span>
                ))}
                <Dot />
                <span className="inline-flex items-center gap-1.5">
                  {owner ? <Avatar name={owner} photoUrl={null} size={20} /> : null}
                  <span className="text-ink">{owner ?? "No salesperson"}</span>
                </span>
              </span>
            }
            actions={
              <ProfileActions
                customerId={customer.id}
                name={name}
                status={customer.status}
                call={telUrl(customer.phone)}
                whatsapp={whatsappUrl(customer.phone)}
                admin={admin}
                documentCount={documents.ok ? documents.documents.length : null}
              />
            }
          />
          <ProfileNotice />

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="flex min-w-0 flex-col gap-3">
              <NextStepCard customer={customer} today={today} next={nextSchedule} />
              <ScheduleCard data={schedules} now={now} owners={owners} retryHref={`/customers/${customer.id}`} />
              <StageCard customer={customer} today={today} />
              <ChatCard chat={chat} viewerId={viewerId} retryHref={`/customers/${customer.id}`} />
              <DocumentsPanel customerId={customer.id} initial={documents} />
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <ContactCard customer={customer} />
              <QuoteCard customer={customer} />
              <SalespersonCard customer={customer} admin={admin} />
              <NotesCard notes={customer.notes} />
              <p className="px-1 text-xs text-muted">
                Added {formatDateTime(customer.created_at) ?? "at an unknown time"}
                {customer.updated_at ? ` · Last changed ${formatDateTime(customer.updated_at)}` : ""}
              </p>
            </div>
          </div>
        </div>
      </ScheduleProvider>
    </ProfileProvider>
  )
}

function ContactValue({ field, customer }: { field: { key: ContactKey; value: string }; customer: Customer }) {
  const tel = telUrl(customer.phone)
  if (field.key === "phone" && tel) {
    const tone = readablePhone(customer.phone)?.readable ? "" : "text-muted"
    return (
      <a href={tel} className={`-my-3 inline-flex min-h-11 items-center tabular-nums underline decoration-line underline-offset-4 hover:decoration-ink ${tone}`}>
        {field.value}
      </a>
    )
  }
  if (field.key === "email") {
    return (
      <a href={`mailto:${field.value}`} className="-my-3 inline-flex min-h-11 items-center break-all underline decoration-line underline-offset-4 hover:decoration-ink">
        {field.value}
      </a>
    )
  }
  return <>{field.value}</>
}

function ContactCard({ customer }: { customer: Customer }) {
  const { filled, missing } = contactFields(customer)
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Contact" />
      {filled.length > 0 ? (
        <dl className="-mt-2 divide-y divide-line">
          {filled.map((field) => (
            <div key={field.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
              <dt className="text-[13px] text-muted">{field.label}</dt>
              <dd className="min-w-0 break-words text-right text-sm">
                <ContactValue field={field} customer={customer} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">No contact details saved yet.</p>
      )}
      {missing.length > 0 ? (
        <div className="mt-2">
          <EditLink field={missing[0]}>{filled.length > 0 ? "Add missing details" : "Add contact details"}</EditLink>
        </div>
      ) : null}
    </Card>
  )
}

// The latest quote request from the website form, read-only. The monthly cost
// is the headline (numbers lead in this design); the answers follow as rows.
// Leads entered by staff have no quote, so the card is not shown for them.
function QuoteCard({ customer }: { customer: Customer }) {
  const view = quoteView(customer.quote_details)
  if (!view) return null
  const received = formatDateTime(quoteSubmittedAt(customer.quote_details))
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Website quote request" meta={received ? `Received ${received}` : "From the website form"} />
      {view.cost ? (
        <div className="-mt-1 mb-3 rounded-[12px] border border-line bg-surface-raised p-3">
          <p className="text-[13px] text-muted">Monthly electricity cost</p>
          <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[28px] leading-tight font-normal tracking-[-0.02em] tabular-nums">{view.cost}</p>
            {view.reduction !== null ? (
              <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent tabular-nums">
                Wants {view.reduction}% less
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <dl className="divide-y divide-line">
        {view.rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
            <dt className="text-[13px] text-muted">{row.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-right text-sm font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      {view.mapHref ? (
        <a
          href={view.mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${pillClass("tinted", "h-11 px-4 md:h-9")} mt-3 w-full justify-center gap-1.5`}
        >
          <MapPin aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Open in Google Maps
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
    </Card>
  )
}

function SalespersonCard({ customer, admin }: { customer: Customer; admin: boolean }) {
  const person = customer.salesperson
  const name = personName(person)
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Salesperson" action={admin ? <EditLink field="sales_id">Reassign</EditLink> : undefined} />
      {person && name ? (
        <div className="flex items-center gap-3">
          <Avatar name={name} photoUrl={person.photo_url ?? person.avatar_url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-[13px] text-muted">
              {person.role ?? "No role"}
              {person.status === "Inactive" ? ", inactive" : ""}
            </p>
          </div>
        </div>
      ) : (
        <SalespersonEmpty assigned={Boolean(customer.sales_id)} admin={admin} />
      )}
    </Card>
  )
}

function SalespersonEmpty({ assigned, admin }: { assigned: boolean; admin: boolean }) {
  if (assigned) return <p className="text-[13px] text-muted">Assigned, but you cannot see that person&apos;s profile.</p>
  if (admin) return <p className="text-[13px] text-muted">Nobody is assigned. Use Reassign to give this customer to a salesperson.</p>
  return <p className="text-[13px] text-muted">Nobody is assigned. Ask an Admin to assign this customer.</p>
}

function NotesCard({ notes }: { notes: string | null }) {
  const blocks = noteBlocks(notes)
  // Notes are appended oldest first; the newest website entry is shown on top.
  const entries = blocks.filter((block) => block.kind === "entry").reverse()
  const text = blocks.filter((block) => block.kind === "text")
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Notes" action={<EditLink field="notes">{blocks.length > 0 ? "Edit notes" : "Add a note"}</EditLink>} />
      {blocks.length === 0 ? (
        <p className="text-[13px] text-muted">No notes yet. Write down what was agreed, so a colleague can pick up.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {text.map((block, index) => (
            <p key={`text-${index}`} className="whitespace-pre-wrap break-words text-sm">
              {block.kind === "text" ? block.text : null}
            </p>
          ))}
          {entries.map((block, index) => (block.kind === "entry" ? <NoteEntry key={`entry-${index}`} entry={block} /> : null))}
        </div>
      )}
    </Card>
  )
}

// One request the website appended to the notes.
function NoteEntry({ entry }: { entry: Extract<NoteBlock, { kind: "entry" }> }) {
  const chat = /chat/i.test(entry.title)
  return (
    <article className="rounded-[12px] border border-line bg-surface-raised p-3">
      <header className="flex items-start gap-3">
        <IconCircle icon={chat ? MessageSquare : ReceiptText} tint={chat ? "grey" : "blue"} />
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{entry.title}</h3>
          <p className="text-xs text-muted tabular-nums">{entry.when}</p>
        </div>
      </header>
      {entry.lines.length > 0 ? (
        <dl className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
          {entry.lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 text-sm">
              <dt className="text-[13px] text-muted">{line.label ?? ""}</dt>
              <dd className="min-w-0 break-words">
                {line.href ? <MapLink href={line.href}>{line.text}</MapLink> : line.text}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

// Opens Google Maps in a new tab; the pin icon says where the link goes.
function MapLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="-my-3 inline-flex min-h-11 items-center gap-1 underline decoration-line underline-offset-4 hover:decoration-ink md:-my-1 md:min-h-0"
    >
      <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
      <span>{children}</span>
      <span className="sr-only"> (opens Google Maps in a new tab)</span>
    </a>
  )
}
