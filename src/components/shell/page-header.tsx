import type { ReactNode } from "react"

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[32px] font-normal leading-tight tracking-tight md:text-[40px]">{title}</h1>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
