import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { CustomerListRow } from "@/lib/data/customers"
import { StatusChip } from "./status-chip"

const COLUMNS =
  "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_20px] md:items-center md:gap-4"

// Lookup list, not the working table (that is /leads): four fields to
// recognise a customer by, and the whole row opens the profile.
export function CustomerList({ rows }: { rows: CustomerListRow[] }) {
  return (
    <div>
      <div aria-hidden="true" className={`hidden border-b border-line px-3 pb-2 text-[13px] text-muted ${COLUMNS}`}>
        <span>Name</span>
        <span>Phone</span>
        <span>Business</span>
        <span>Location</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/customers/${row.id}`}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-3 text-sm transition-colors duration-150 hover:bg-surface-sunken ${COLUMNS}`}
            >
              <span className="min-w-0 flex-1 md:contents">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words font-medium">
                    {row.customer_name?.trim() || "Unnamed customer"}
                  </span>
                  <StatusChip status={row.status} />
                </span>
                <span className="mt-1 block min-w-0 break-words tabular-nums text-muted md:mt-0 md:text-ink">
                  <span className="sr-only">Phone: </span>
                  {row.phone?.trim() || <span className="text-muted">No phone</span>}
                </span>
                {row.business?.trim() ? (
                  <span className="block min-w-0 break-words text-muted md:text-ink">
                    <span className="sr-only">Business: </span>
                    {row.business.trim()}
                  </span>
                ) : (
                  <span className="hidden md:block" />
                )}
                {row.location?.trim() ? (
                  <span className="block min-w-0 break-words text-muted md:text-ink">
                    <span className="sr-only">Location: </span>
                    {row.location.trim()}
                  </span>
                ) : (
                  <span className="hidden md:block" />
                )}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
