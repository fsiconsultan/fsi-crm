import type { ReactNode } from "react"

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string
  /** One muted line under the title, for example "3,010 leads". */
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-5">
      <div className="min-w-0">
        <h1 className="text-[32px] font-normal leading-tight tracking-[-0.02em] md:text-[40px]">{title}</h1>
        {meta ? <p className="text-[13px] tabular-nums text-muted">{meta}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
