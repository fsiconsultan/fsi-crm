import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

export function Card({
  className,
  children,
  as: Tag = "section",
}: {
  className?: string
  children: ReactNode
  as?: "section" | "article" | "div"
}) {
  return (
    <Tag className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5", className)}>
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  meta,
  action,
  id,
}: {
  title: string
  meta?: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-medium leading-6 text-ink">
          {title}
        </h2>
        {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

/** The text link with a chevron at the top right of a card ("Leakage >" in the reference). */
export function CardHeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-[var(--radius-control)] px-2 text-[13px] font-medium hover:underline md:min-h-9"
    >
      {children}
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  )
}
