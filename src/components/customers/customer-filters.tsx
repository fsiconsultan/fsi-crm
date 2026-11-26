"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition, type KeyboardEvent } from "react"
import { ArrowDownUp, Search, Tag, Users, X } from "lucide-react"
import { PillMenu, type FilterOption } from "@/components/dashboard/dashboard-filters"
import { pillClass } from "@/components/ui/pill"
import { LEAD_TYPES } from "@/lib/leads/status"
import { CUSTOMER_SORTS, CUSTOMER_SORT_KEYS, customersHref, isFiltered, type CustomerFilters } from "./filters"

const SEARCH_DELAY_MS = 300

// Links answer Enter; a switch answers Space too.
function clickOnSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== " ") return
  event.preventDefault()
  event.currentTarget.click()
}

const toggleTone = { on: "on", off: "tinted" } as const

function TogglePill({ label, on, href }: { label: string; on: boolean; href: string }) {
  return (
    <Link href={href} role="switch" aria-checked={on} onKeyDown={clickOnSpace} scroll={false} className={pillClass(toggleTone[on ? "on" : "off"])}>
      {label}
    </Link>
  )
}

/**
 * The search box applies as you type: 300 ms after the last key the URL is
 * replaced (not pushed, so Back does not step through every letter). Enter
 * applies at once. The box keeps what is typed while the list catches up, and
 * takes the URL's value only when the search changes from elsewhere (a "Clear
 * all" link, Back).
 */
function LiveSearch({ filters }: { filters: CustomerFilters }) {
  const router = useRouter()
  const [value, setValue] = useState(filters.q)
  // The last query this box sent, and the URL query it last saw.
  const [sent, setSent] = useState(filters.q)
  const [seen, setSeen] = useState(filters.q)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (filters.q !== seen) {
    setSeen(filters.q)
    if (filters.q !== sent) {
      setSent(filters.q)
      setValue(filters.q)
    }
  }

  const apply = (next: string) => {
    if (timer.current) clearTimeout(timer.current)
    const q = next.trim().slice(0, 100)
    if (q === sent) return
    setSent(q)
    startTransition(() => router.replace(customersHref({ ...filters, q, page: 1 }), { scroll: false }))
  }

  const onType = (next: string) => {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => apply(next), SEARCH_DELAY_MS)
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        apply(value)
      }}
      className="relative min-w-0 flex-[1_1_100%] sm:flex-[1_1_16rem] md:w-72 md:flex-none"
    >
      <label htmlFor="customer-search" className="sr-only">
        Search customers by name, phone, business or location
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        strokeWidth={1.75}
      />
      <input
        id="customer-search"
        type="search"
        value={value}
        onChange={(event) => onType(event.target.value)}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Name, phone or business"
        className="h-11 w-full rounded-full border border-[color-mix(in_srgb,var(--muted)_75%,transparent)] bg-surface-raised pl-10 pr-11 text-base text-ink placeholder:text-muted md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("")
            apply("")
          }}
          className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-[120ms] hover:text-ink md:size-10"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Clear the search</span>
        </button>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {pending ? "Searching" : ""}
      </p>
    </form>
  )
}

export type SalesChoice = { id: string; name: string }

/**
 * Search plus pill filters in the reference header style. Every pill choice is
 * a link, so the URL stays the one source of truth. On a phone the pills wrap
 * under the full-width search and their menus open as bottom sheets.
 */
export function CustomerFilterBar({
  filters,
  sales,
}: {
  filters: CustomerFilters
  /** The salesperson menu, Admin only; null hides it. */
  sales: SalesChoice[] | null
}) {
  const href = (patch: Partial<CustomerFilters>) => customersHref({ ...filters, ...patch, page: 1 })
  const person = sales?.find((choice) => choice.id === filters.sales)

  const salesOptions: FilterOption[] = sales
    ? [
        { label: "Whole team", href: href({ sales: "" }), checked: !person },
        ...sales.map((choice) => ({ label: choice.name, href: href({ sales: choice.id }), checked: choice.id === person?.id })),
      ]
    : []

  const typeOptions: FilterOption[] = [
    { label: "Customers and partners", href: href({ type: "" }), checked: !filters.type },
    ...LEAD_TYPES.map((type) => ({ label: `${type}s only`, href: href({ type }), checked: filters.type === type })),
  ]

  const sortOptions: FilterOption[] = CUSTOMER_SORT_KEYS.map((sort) => ({
    label: CUSTOMER_SORTS[sort],
    href: href({ sort }),
    checked: filters.sort === sort,
  }))

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <LiveSearch filters={filters} />
      {sales ? (
        <PillMenu
          menuLabel="Salesperson"
          icon={Users}
          text={person?.name ?? "Whole team"}
          hint=", change whose customers are shown"
          options={salesOptions}
        />
      ) : null}
      <PillMenu
        menuLabel="Lead type"
        icon={Tag}
        text={filters.type ? `${filters.type}s` : "Any type"}
        hint=", change the lead type"
        options={typeOptions}
      />
      <TogglePill label="Has documents" on={filters.docs} href={href({ docs: !filters.docs })} />
      <TogglePill label="Has WhatsApp chat" on={filters.chat} href={href({ chat: !filters.chat })} />
      {isFiltered(filters) ? (
        <Link
          href={customersHref({ ...filters, q: "", sales: "", type: "", docs: false, chat: false, page: 1 })}
          className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium underline decoration-line underline-offset-4 hover:decoration-ink md:min-h-10"
        >
          Clear all
        </Link>
      ) : null}
      <div className="md:ml-auto">
        <PillMenu
          menuLabel="Order"
          icon={ArrowDownUp}
          text={CUSTOMER_SORTS[filters.sort]}
          hint=", change the order"
          options={sortOptions}
        />
      </div>
    </div>
  )
}
