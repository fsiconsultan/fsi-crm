import type { ReactNode } from "react"

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-5">
      <h1 className="text-[32px] font-normal leading-tight tracking-[-0.02em] md:text-[40px]">{title}</h1>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
