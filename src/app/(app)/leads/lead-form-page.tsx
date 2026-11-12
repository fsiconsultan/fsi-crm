import { LeadForm } from "@/components/leads/lead-form"
import { Card } from "@/components/ui/card"
import type { LeadField } from "./actions"
import type { Lead, SalesUser } from "@/lib/data/leads"

// Shared by /leads/new and /leads/[id]/edit.
export function LeadFormCard({
  lead,
  salesUsers,
  back,
}: {
  lead: Lead | null
  salesUsers: SalesUser[] | null
  back: string
}) {
  const initial: Record<LeadField, string> = {
    customer_name: lead?.customer_name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    business: lead?.business ?? "",
    location: lead?.location ?? "",
    lead_type: lead?.lead_type ?? "Customer",
    status: lead ? (lead.status ?? "") : "New",
    sales_id: lead?.sales_id ?? "",
    follow_up_date: lead?.follow_up_date ?? "",
    appointment: lead?.appointment ?? "",
    site_survey: lead?.site_survey ?? "",
    quotation: lead?.quotation ?? "",
    notes: lead?.notes ?? "",
  }

  return (
    <Card className="max-w-4xl">
      <LeadForm leadId={lead?.id ?? null} initial={initial} salesUsers={salesUsers} back={back} />
    </Card>
  )
}

export function safeBack(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/leads") ? value : "/leads"
}
