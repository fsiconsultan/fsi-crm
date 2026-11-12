"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import type { Role } from "@/lib/auth"
import { cn } from "@/lib/cn"
import { logout } from "@/app/login/actions"
import { navFor } from "./nav"
import { NotificationToggle } from "./notification-toggle"
import { ThemeToggle } from "./theme-toggle"

type SidebarUser = { name: string; role: Role; photoUrl: string | null }

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function SidebarBody({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = navFor(user.role)
  const main = items.filter((item) => item.group === "main")
  const analyze = items.filter((item) => item.group === "analyze")

  const renderItem = (item: (typeof items)[number]) => {
    const active = isActive(pathname, item.href)
    const Icon = item.icon
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm transition-colors duration-150 md:min-h-10",
            active ? "bg-ink font-medium text-ink-contrast" : "text-ink hover:bg-surface",
          )}
        >
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1 py-1">
        <Image
          src="/logo-fsi.jpg"
          alt=""
          width={46}
          height={24}
          className="h-6 w-auto rounded-[4px]"
          priority
        />
        <span className="text-[19px] font-medium tracking-tight">FSI CRM</span>
      </Link>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-6">
        <ul className="flex flex-col gap-1">{main.map(renderItem)}</ul>
        {analyze.length > 0 ? (
          <div>
            <p className="mb-2 px-3 text-xs text-muted">Analyze</p>
            <ul className="flex flex-col gap-1">{analyze.map(renderItem)}</ul>
          </div>
        ) : null}
      </nav>

      <div className="flex flex-col gap-1">
        <NotificationToggle />
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm text-ink transition-colors duration-150 hover:bg-surface md:min-h-10"
          >
            <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-1 pt-4">
        {user.photoUrl ? (
          <Image
            src={user.photoUrl}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink ring-1 ring-line"
          >
            {initials(user.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.role} · French Solar Industry</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 md:block">
        <SidebarBody user={user} />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas px-4 py-2 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-fsi.jpg" alt="" width={46} height={24} className="h-6 w-auto rounded-[4px]" />
          <span className="text-base font-medium">FSI CRM</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] hover:bg-surface"
        >
          <Menu aria-hidden="true" className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-[min(300px,85vw)] overflow-y-auto bg-canvas shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-[var(--radius-control)] hover:bg-surface"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Close menu</span>
            </button>
            <SidebarBody user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}
