import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

type Variant = "primary" | "secondary" | "ghost"

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ink-contrast hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-sunken",
  ghost: "text-ink hover:bg-surface-sunken",
}

export function buttonClass(variant: Variant = "secondary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10",
    variants[variant],
    className,
  )
}

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}
