import { PageHeader } from "@/components/shell/page-header"

const ROWS = 8

// The list's own shape while it loads, so nothing jumps when the rows arrive.
// The blocks are hidden from screen readers; the status line says what is happening.
export default function CustomersLoading() {
  return (
    <>
      <PageHeader title="Customers" meta="Loading customers…" />
      <div aria-hidden="true" className="mb-4 flex flex-wrap gap-2">
        <span className="h-11 w-full rounded-full bg-surface-sunken sm:w-72 md:h-10" />
        <span className="h-11 w-36 rounded-full bg-surface-sunken md:h-10" />
        <span className="h-11 w-36 rounded-full bg-surface-sunken md:h-10" />
      </div>
      <p role="status" className="sr-only">
        Loading customers
      </p>
      <div aria-hidden="true" className="flex flex-col gap-2 md:gap-0 md:rounded-[var(--radius-card)] md:border md:border-line md:bg-surface md:p-3">
        {Array.from({ length: ROWS }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-4 md:rounded-[12px] md:border-0 md:bg-transparent md:px-3 md:py-3.5"
          >
            <span className="size-9 shrink-0 rounded-full bg-surface-sunken" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3.5 w-40 max-w-full rounded-full bg-surface-sunken" />
              <span className="h-3 w-56 max-w-full rounded-full bg-surface-sunken" />
            </span>
            <span className="h-5 w-24 rounded-full bg-surface-sunken max-md:hidden" />
          </div>
        ))}
      </div>
    </>
  )
}
