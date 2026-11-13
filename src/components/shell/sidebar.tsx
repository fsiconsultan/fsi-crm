"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRef, useSyncExternalStore, type RefObject } from "react"
import { Bell, LogOut, Menu as MenuIcon, MoreHorizontal, PanelLeft, Search, X } from "lucide-react"
import { logout } from "@/app/login/actions"
import { Avatar } from "@/components/ui/avatar"
import { Menu, menuItemClass } from "@/components/ui/menu"
import type { Role } from "@/lib/auth"
import { cn } from "@/lib/cn"
import { readHtmlFlag, subscribeHtmlFlags, writeHtmlFlag } from "@/lib/html-flags"
import { forgetThisDevice } from "@/lib/push/device"
import { useOnMountEffect } from "@/lib/use-on-mount-effect"
import { CommandPalette } from "./command-palette"
import { navFor, type NavItem } from "./nav"
import { NotificationToggle } from "./notification-toggle"
import { ThemeToggle } from "./theme-toggle"

type SidebarUser = { name: string; role: Role; photoUrl: string | null }
type Variant = "desktop" | "drawer"

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

// One row style for nav links, Notifications and the search field's height.
// md:rail: applies in the collapsed icon rail on desktop only; the phone drawer never collapses.
const rowClass =
  "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm transition-colors duration-[120ms] md:min-h-10 md:rail:justify-center md:rail:px-0"

const rowTone = {
  active: "bg-ink font-medium text-ink-contrast",
  idle: "text-ink hover:bg-line/60",
} as const

const railLabel = "truncate md:rail:sr-only"

const iconClass = "size-[18px] shrink-0"

const subscribeNothing = () => () => {}
const shortcutLabel = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K")

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href)
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(rowClass, rowTone[active ? "active" : "idle"])}
      >
        <item.icon aria-hidden="true" className={iconClass} strokeWidth={1.75} />
        <span className={railLabel}>{item.label}</span>
      </Link>
    </li>
  )
}

function CollapseButton() {
  const collapsed = useSyncExternalStore(subscribeHtmlFlags, () => readHtmlFlag("sidebar") === "collapsed", () => false)
  return (
    <button
      type="button"
      onClick={() => writeHtmlFlag("sidebar", collapsed ? "" : "collapsed")}
      aria-expanded={!collapsed}
      aria-controls="sidebar"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-line bg-surface-raised text-ink transition-colors duration-[120ms] hover:bg-surface-sunken"
    >
      <PanelLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
      <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
    </button>
  )
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] px-1 md:min-h-9">
      {/* The panel mark from FSI's own app icon, cropped to the reference's rounded square. */}
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={28}
        height={28}
        priority
        className="size-7 shrink-0 rounded-[8px] border border-line bg-surface-raised object-cover"
      />
      <span className={cn("text-[19px] font-medium tracking-tight", railLabel)}>FSI CRM</span>
    </Link>
  )
}

function SearchField({ onSearch }: { onSearch: () => void }) {
  const shortcut = useSyncExternalStore(subscribeNothing, shortcutLabel, () => "⌘K")
  return (
    <button
      type="button"
      onClick={onSearch}
      aria-keyshortcuts="Meta+K Control+K"
      title="Search leads"
      className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-line bg-surface-raised px-3 text-sm text-muted transition-colors duration-[120ms] hover:border-muted/50 md:min-h-10 md:rail:justify-center md:rail:px-0"
    >
      <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 text-left md:rail:sr-only">
        Search<span className="sr-only"> leads</span>
      </span>
      <kbd aria-hidden="true" className="rounded-[6px] bg-line/70 px-1.5 py-0.5 font-sans text-[11px] text-muted max-md:hidden md:rail:hidden">
        {shortcut}
      </kbd>
    </button>
  )
}

function NotificationsLink({ waiting, onNavigate }: { waiting: number | null; onNavigate?: () => void }) {
  const count = waiting ?? 0
  const label = count === 1 ? "1 chat waiting for you" : `${count} chats waiting for you`
  return (
    <Link
      href="/inbox"
      onClick={onNavigate}
      title={count > 0 ? `Notifications: ${label}` : "Notifications"}
      className={cn(rowClass, rowTone.idle)}
    >
      <Bell aria-hidden="true" className={iconClass} strokeWidth={1.75} />
      <span className={cn("flex-1", railLabel)}>Notifications</span>
      {count > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sun px-1.5 text-[11px] font-semibold text-on-sun tabular-nums md:rail:absolute md:rail:right-2 md:rail:top-0.5 md:rail:h-4 md:rail:min-w-4 md:rail:px-1 md:rail:text-[10px]"
          >
            {count > 99 ? "99+" : count}
          </span>
          <span className="sr-only">, {label}</span>
        </>
      ) : null}
    </Link>
  )
}

function ProfileMenu({ user }: { user: SidebarUser }) {
  return (
    <Menu
      label="Account"
      placement="above-start"
      className="w-full"
      menuClassName="md:w-72"
      triggerClassName="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-control)] px-1 py-1.5 text-left transition-colors duration-[120ms] hover:bg-line/60 md:rail:justify-center"
      trigger={
        <>
          <Avatar name={user.name} photoUrl={user.photoUrl} size={36} />
          <span className="min-w-0 flex-1 md:rail:sr-only">
            <span className="sr-only">Account menu, </span>
            <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
            <span className="block truncate text-xs text-muted">{user.role} · French Solar Industry</span>
          </span>
          <MoreHorizontal aria-hidden="true" className="size-[18px] shrink-0 text-muted md:rail:hidden" />
        </>
      }
    >
      {() => (
        <>
          <NotificationToggle />
          <ThemeToggle />
          <div role="separator" className="my-1 h-px bg-line" />
          <form
            action={async () => {
              // A shared phone must not keep the previous user's notifications.
              await forgetThisDevice()
              await logout()
            }}
          >
            <button type="submit" role="menuitem" tabIndex={-1} className={menuItemClass}>
              <LogOut aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </>
      )}
    </Menu>
  )
}

function SidebarBody({
  user,
  waiting,
  variant,
  onSearch,
  onNavigate,
}: {
  user: SidebarUser
  waiting: number | null
  variant: Variant
  onSearch: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const items = navFor(user.role)
  const main = items.filter((item) => item.group === "main")
  const analyze = items.filter((item) => item.group === "analyze")
  const bottom = items.filter((item) => item.group === "bottom")

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 p-4 md:rail:px-3">
      <div className="flex items-center justify-between gap-2 md:rail:flex-col">
        <Logo onNavigate={onNavigate} />
        {variant === "desktop" ? <CollapseButton /> : null}
      </div>

      <SearchField onSearch={onSearch} />

      <nav aria-label="Primary" className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
        <ul className="flex flex-col gap-1">
          {main.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>
        {analyze.length > 0 ? (
          <div>
            <p className="mb-2 px-3 text-xs text-muted md:rail:sr-only">Analyze</p>
            <div aria-hidden="true" className="mx-2 mb-3 hidden h-px bg-line md:rail:block" />
            <ul className="flex flex-col gap-1">
              {analyze.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1">
          <li>
            <NotificationsLink waiting={waiting} onNavigate={onNavigate} />
          </li>
          {bottom.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>
        <div className="border-t border-line pt-3">
          <ProfileMenu user={user} />
        </div>
      </div>
    </div>
  )
}

function MobileDrawer({
  ref,
  user,
  waiting,
  onSearch,
}: {
  ref: RefObject<HTMLDialogElement | null>
  user: SidebarUser
  waiting: number | null
  onSearch: () => void
}) {
  const close = () => ref.current?.close()
  // A modal <dialog>: the browser traps focus, Escape closes it and focus returns to the menu button.
  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(300px,85vw)] bg-canvas p-0 text-ink shadow-xl backdrop:bg-scrim/40 md:hidden"
    >
      <button
        type="button"
        onClick={close}
        className="absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-[var(--radius-control)] transition-colors duration-[120ms] hover:bg-line/60"
      >
        <X aria-hidden="true" className="size-5" />
        <span className="sr-only">Close menu</span>
      </button>
      <SidebarBody user={user} waiting={waiting} variant="drawer" onSearch={onSearch} onNavigate={close} />
    </dialog>
  )
}

export function Sidebar({ user, waiting }: { user: SidebarUser; waiting: number | null }) {
  const drawerRef = useRef<HTMLDialogElement>(null)
  const paletteRef = useRef<HTMLDialogElement>(null)

  const openSearch = () => {
    drawerRef.current?.close()
    const palette = paletteRef.current
    if (!palette || palette.open) return
    palette.showModal()
    palette.querySelector("input")?.focus()
  }

  // Cmd+K or Ctrl+K opens the search from anywhere in the app, and closes it again.
  useOnMountEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      if (paletteRef.current?.open) paletteRef.current.close()
      else openSearch()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <>
      <aside id="sidebar" aria-label="Sidebar" className="sticky top-0 hidden h-dvh w-[248px] shrink-0 md:flex md:rail:w-[72px]">
        <SidebarBody user={user} waiting={waiting} variant="desktop" onSearch={openSearch} />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas px-4 py-1.5 md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => drawerRef.current?.showModal()}
          aria-haspopup="dialog"
          className="-mr-2 flex size-11 items-center justify-center rounded-[var(--radius-control)] transition-colors duration-[120ms] hover:bg-line/60"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      <MobileDrawer ref={drawerRef} user={user} waiting={waiting} onSearch={openSearch} />
      <CommandPalette ref={paletteRef} />
    </>
  )
}
