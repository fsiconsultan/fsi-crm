import Link from "next/link"
import { addedOn, leadName } from "@/components/leads/format"
import { StatusChip } from "@/components/leads/status-chip"
import { Card, CardHeader } from "@/components/ui/card"
import type { Lead } from "@/lib/data/leads"
import { leadsHref } from "@/lib/leads/filters"

export function RecentCard({
  leads,
  owners,
  salesId,
}: {
  leads: Lead[]
  /** Salesperson names by id; only Admin sees other people's leads. */
  owners: Map<string, string> | null
  salesId: string
}) {
  return (
    <Card>
      <CardHeader
        title="Recently added"
        action={
          <Link
            href={leadsHref({ sales: salesId, sort: "newest" })}
            className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-ink md:min-h-8"
          >
            All, newest first
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {leads.map((lead) => {
          const detail = [lead.business, owners?.get(lead.sales_id ?? "")].filter(Boolean).join(" · ")
          return (
            <li key={lead.id}>
              <Link href={`/customers/${lead.id}`} className="group flex min-h-11 items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:underline">
                    {leadName(lead.customer_name)}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {addedOn(lead.created_at)}
                    {detail ? ` · ${detail}` : ""}
                  </span>
                </span>
                <StatusChip status={lead.status} />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
