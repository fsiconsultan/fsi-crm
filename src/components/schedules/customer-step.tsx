"use client"

import { useId, useRef, useState, type KeyboardEvent } from "react"
import { Search } from "lucide-react"
import { searchBookingCustomersAction } from "@/app/(app)/calendar/actions"
import { leadName } from "@/components/leads/format"
import { StatusChip } from "@/components/leads/status-chip"
import { controlClass } from "@/components/ui/control"
import {
  SEARCH_IDLE,
  finishSearch,
  hitsOf,
  moveActive,
  placeLine,
  searchMessage,
  startSearch,
  type CustomerHit,
  type SearchState,
} from "./customer-search"

const DEBOUNCE_MS = 180

const optionTone = { active: "bg-surface-sunken", idle: "" } as const

/**
 * The booking dialog's first step when it opens from the Calendar: an
 * editable combobox over a listbox, as the command palette. Typing searches
 * name, phone or business; ArrowUp and ArrowDown move, Enter or a tap picks.
 */
export function CustomerStep({ onPick }: { onPick: (hit: CustomerHit) => void }) {
  const inputId = useId()
  const listId = useId()
  const statusId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchState>(SEARCH_IDLE)
  const [active, setActive] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(0)
  const hits = hitsOf(results)

  const search = (value: string) => {
    setQuery(value)
    setActive(0)
    clearTimeout(timer.current)
    const next = startSearch(results, value)
    setResults(next)
    if (next.kind === "idle") {
      latest.current += 1
      return
    }
    timer.current = setTimeout(async () => {
      const call = ++latest.current
      const result = await searchBookingCustomersAction(value).catch(() => ({ ok: false as const }))
      if (call !== latest.current) return
      setResults(finishSearch(result, value))
    }, DEBOUNCE_MS)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const next = moveActive(active, event.key, hits.length)
    if (next !== null) {
      event.preventDefault()
      setActive(next)
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" })
    } else if (event.key === "Enter") {
      // Enter never submits anything here: it picks the highlighted customer, if any.
      event.preventDefault()
      if (hits[active]) onPick(hits[active])
    }
  }

  const optionId = (index: number) => `${listId}-${index}`

  return (
    // On a phone the step fills the sheet, so the list has room above the on-screen keyboard.
    <div className="flex flex-col gap-2 max-sm:min-h-[calc(100dvh-176px)]">
      <label htmlFor={inputId} className="text-sm font-medium">
        Customer
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={hits[active] ? optionId(active) : undefined}
          aria-describedby={statusId}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Name, phone or business"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={onKeyDown}
          data-autofocus
          className={`${controlClass} pl-9`}
        />
      </div>

      <p id={statusId} role="status" aria-live="polite" className="text-[13px] text-muted">
        {searchMessage(results)}
      </p>

      <ul id={listId} role="listbox" aria-label="Customers" className="-mx-1.5 flex flex-col gap-0.5 empty:hidden">
        {hits.map((hit, index) => (
          <li
            key={hit.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            onClick={() => onPick(hit)}
            onMouseMove={() => setActive(index)}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 ${optionTone[index === active ? "active" : "idle"]}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{leadName(hit.name)}</span>
              <span className="block truncate text-[13px] text-muted">{placeLine(hit) || hit.phone || "No business or location saved"}</span>
            </span>
            <StatusChip status={hit.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}
