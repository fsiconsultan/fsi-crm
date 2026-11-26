import { BackLink } from "@/components/customers/back-link"

const bar = "rounded-full bg-surface-sunken"
const card = "rounded-[var(--radius-card)] border border-line bg-surface p-5 max-md:p-4"

function CardShape({ lines }: { lines: number }) {
  return (
    <div className={card}>
      <span className={`block h-4 w-32 ${bar}`} />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className={`block h-3 ${bar}`} />
        ))}
      </div>
    </div>
  )
}

// The profile's own shape while it loads: header, the wide work column and the
// narrow details column. The blocks are hidden from screen readers.
export default function CustomerLoading() {
  return (
    <>
      <BackLink />
      <p role="status" className="sr-only">
        Loading the customer profile
      </p>
      <div aria-hidden="true">
        <div className="mb-5 flex flex-col gap-3">
          <span className={`block h-9 w-64 max-w-full md:h-11 ${bar}`} />
          <span className={`block h-5 w-80 max-w-full ${bar}`} />
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <div className="flex flex-col gap-3">
            <CardShape lines={2} />
            <CardShape lines={4} />
            <CardShape lines={3} />
          </div>
          <div className="flex flex-col gap-3">
            <CardShape lines={4} />
            <CardShape lines={1} />
          </div>
        </div>
      </div>
    </>
  )
}
