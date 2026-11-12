import { Mail, MessageCircle, Phone } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Avatar } from "@/components/ui/avatar"
import { buttonClass } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import type { Customer } from "@/lib/data/customers"
import type { DocumentList } from "@/lib/data/documents"
import { DocumentsPanel } from "./documents-panel"
import { EditCustomer, type SalesChoices } from "./edit-customer"
import { formatDateTime, telUrl, whatsappUrl } from "./format"
import { PipelineTimeline } from "./pipeline-timeline"
import { StatusChip } from "./status-chip"

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  )
}

const NONE = <span className="text-muted">Not recorded</span>

// Thumb-sized on a phone (48px), back to the normal control height from sm up.
const ACTION = "min-h-12 px-3 sm:min-h-11 sm:px-4 md:min-h-10"

// One customer on one screen. The pipeline is the focal card: where the deal
// stands is what staff open a profile to find out.
export function CustomerProfile({
  customer,
  documents,
  salesOptions,
  admin,
}: {
  customer: Customer
  documents: DocumentList
  // null unless the viewer is an Admin, who may reassign the customer.
  salesOptions: SalesChoices
  admin: boolean
}) {
  const id = customer.id
  const { salesperson, ...lead } = customer
  const whatsapp = whatsappUrl(customer.phone)
  const call = telUrl(customer.phone)
  const email = customer.email?.trim() || null
  const statusSince = formatDateTime(customer.status_started_at)

  return (
    <>
      <PageHeader
        title={customer.customer_name?.trim() || "Unnamed customer"}
        actions={
          <EditCustomer
            customer={lead}
            sales={salesOptions}
            currentSalesName={salesperson ? (salesperson.name ?? salesperson.username) : null}
          />
        }
      />

      {/* Contact actions come first: on a phone this is what a salesperson opens the profile for. */}
      {call || whatsapp || email ? (
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2 sm:flex sm:flex-wrap">
          {call ? (
            <a href={call} className={buttonClass("primary", ACTION)}>
              <Phone aria-hidden="true" className="size-[18px] shrink-0" />
              Call
            </a>
          ) : null}
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", ACTION)}>
              <MessageCircle aria-hidden="true" className="size-[18px] shrink-0" />
              WhatsApp
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={buttonClass("secondary", ACTION)}>
              <Mail aria-hidden="true" className="size-[18px] shrink-0" />
              Email
            </a>
          ) : null}
          {/* Phase C: add the "Open WhatsApp conversation" link to /inbox/<conversation id> here, next to WhatsApp. */}
        </div>
      ) : null}

      {/* Below lg the two columns dissolve (`contents`) so the cards can be ordered for a phone:
          pipeline, notes, documents, then the reference details. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <Card className="order-1 lg:order-none max-md:p-4">
            <CardHeader
              title="Pipeline"
              meta={statusSince ? `In this status since ${statusSince}` : undefined}
              action={<StatusChip status={customer.status} />}
            />
            <PipelineTimeline customer={customer} />
          </Card>

          <Card className="order-3 lg:order-none max-md:p-4">
            <DocumentsPanel customerId={id} initial={documents} />
          </Card>
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <Card className="order-4 lg:order-none max-md:p-4">
            <CardHeader title="Contact" />
            <dl className="divide-y divide-line">
              <Detail label="Phone">
                {customer.phone?.trim() ? (
                  call ? (
                    <a href={call} className="-my-3 inline-flex min-h-11 items-center tabular-nums underline underline-offset-2">
                      {customer.phone.trim()}
                    </a>
                  ) : (
                    <span className="tabular-nums">{customer.phone.trim()}</span>
                  )
                ) : (
                  NONE
                )}
              </Detail>
              <Detail label="Email">
                {email ? (
                  <a href={`mailto:${email}`} className="-my-3 inline-flex min-h-11 items-center underline underline-offset-2">
                    {email}
                  </a>
                ) : (
                  NONE
                )}
              </Detail>
              <Detail label="Business">{customer.business?.trim() || NONE}</Detail>
              <Detail label="Location">{customer.location?.trim() || NONE}</Detail>
              <Detail label="Type">{customer.lead_type ?? NONE}</Detail>
            </dl>
          </Card>

          <Card className="order-5 lg:order-none max-md:p-4">
            <CardHeader title="Salesperson" />
            {salesperson ? (
              <div className="flex items-center gap-3">
                <Avatar
                  name={salesperson.name ?? salesperson.username ?? "?"}
                  photoUrl={salesperson.photo_url ?? salesperson.avatar_url}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {salesperson.name ?? salesperson.username ?? "Unnamed user"}
                  </p>
                  <p className="text-[13px] text-muted">
                    {salesperson.role ?? "No role"}
                    {salesperson.status === "Inactive" ? ", inactive" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                {customer.sales_id
                  ? "Assigned, but you cannot see that person's profile."
                  : admin
                    ? "Nobody is assigned. Use Edit to assign a salesperson."
                    : "Nobody is assigned."}
              </p>
            )}
          </Card>

          <Card className="order-2 lg:order-none max-md:p-4">
            <CardHeader title="Notes" />
            {customer.notes?.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm">{customer.notes.trim()}</p>
            ) : (
              <p className="text-sm text-muted">No notes yet. Use Edit to add one.</p>
            )}
          </Card>

          <p className="order-6 px-1 text-[13px] text-muted lg:order-none">
            Added {formatDateTime(customer.created_at) ?? "at an unknown time"}
            {customer.updated_at ? `, last changed ${formatDateTime(customer.updated_at)}` : ""}
          </p>
        </div>
      </div>
    </>
  )
}
