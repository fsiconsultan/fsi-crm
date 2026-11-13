import { StatusChip } from "@/components/leads/status-chip"
import { groupSchedules } from "@/components/schedules/model"
import { ScheduleCard, type LeadScheduleData } from "@/components/schedules/schedule-card"
import { ScheduleProvider } from "@/components/schedules/schedule-provider"
import { PageHeader } from "@/components/shell/page-header"
import { Avatar } from "@/components/ui/avatar"
import { Card, CardHeader } from "@/components/ui/card"
import type { Customer, CustomerChat } from "@/lib/data/customers"
import type { DocumentList } from "@/lib/data/documents"
import { ChatCard } from "./chat-card"
import { DocumentsPanel } from "./documents-panel"
import type { SalesChoices } from "./edit-customer"
import { customerName, formatDateTime, personName, readablePhone, telUrl, whatsappUrl } from "./format"
import { ProfileActions } from "./profile-actions"
import { EditLink, ProfileNotice, ProfileProvider } from "./profile-context"
import { contactFields, type ContactKey } from "./profile-model"
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
  const text = notes?.trim()
  return (
    <Card className="max-md:p-4">
      <CardHeader title="Notes" action={<EditLink field="notes">{text ? "Edit notes" : "Add a note"}</EditLink>} />
      {text ? (
        <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
      ) : (
        <p className="text-[13px] text-muted">No notes yet. Write down what was agreed, so a colleague can pick up.</p>
      )}
    </Card>
  )
}
