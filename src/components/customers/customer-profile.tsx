import { MessageCircle } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Avatar } from "@/components/ui/avatar"
import { buttonClass } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import type { Customer } from "@/lib/data/customers"
import type { DocumentList } from "@/lib/data/documents"
import type { SalesOption } from "@/lib/data/sales-users"
import { DocumentsPanel } from "./documents-panel"
import { EditCustomer } from "./edit-customer"
import { formatDateTime, whatsappUrl } from "./format"
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
  // Present only for an Admin, who may reassign the customer.
  salesOptions: SalesOption[] | null
  admin: boolean
}) {
  const id = customer.id
  const { salesperson, ...lead } = customer
  const whatsapp = whatsappUrl(customer.phone)
  const statusSince = formatDateTime(customer.status_started_at)

  return (
    <>
      <PageHeader
        title={customer.customer_name?.trim() || "Unnamed customer"}
        actions={
          <>
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
            <EditCustomer customer={lead} salesOptions={salesOptions} />
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="Pipeline"
              meta={statusSince ? `In this status since ${statusSince}` : undefined}
              action={<StatusChip status={customer.status} />}
            />
            <PipelineTimeline customer={customer} />
          </Card>

          <Card>
            <DocumentsPanel customerId={id} initial={documents} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Contact" />
            <dl className="divide-y divide-line">
              <Detail label="Phone">
                {customer.phone?.trim() ? <span className="tabular-nums">{customer.phone.trim()}</span> : NONE}
              </Detail>
              <Detail label="Email">
                {customer.email?.trim() ? (
                  <a href={`mailto:${customer.email.trim()}`} className="-my-3 inline-flex min-h-11 items-center underline underline-offset-2">
                    {customer.email.trim()}
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

          <Card>
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

          <Card>
            <CardHeader title="Notes" />
            {customer.notes?.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm">{customer.notes.trim()}</p>
            ) : (
              <p className="text-sm text-muted">No notes yet. Use Edit to add one.</p>
            )}
          </Card>

          <p className="px-1 text-[13px] text-muted">
            Added {formatDateTime(customer.created_at) ?? "at an unknown time"}
            {customer.updated_at ? `, last changed ${formatDateTime(customer.updated_at)}` : ""}
          </p>
        </div>
      </div>
    </>
  )
}
