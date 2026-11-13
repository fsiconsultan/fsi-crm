import Link from "next/link"
import { ChevronLeft } from "lucide-react"

/** "< Customers" above a profile, its loading state and its error states. */
export function BackLink() {
  return (
    <Link
      href="/customers"
      className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] pr-2 text-sm text-muted transition-colors duration-[120ms] hover:text-ink md:min-h-9"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Customers
    </Link>
  )
}
