"use client"

import { useRouter } from "next/navigation"
import { useId, useRef, useState, type KeyboardEvent, type RefObject } from "react"
import { Search, X } from "lucide-react"
import { searchLeadsAction } from "@/app/(app)/actions"
import { leadName } from "@/components/leads/format"
import type { LeadHit } from "@/lib/data/leads"
import { LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"

type Results =
  | { kind: "idle" }
  | { kind: "loading"; hits: LeadHit[] }
  | { kind: "done"; hits: LeadHit[]; term: string; more: boolean }
  | { kind: "error" }

const DEBOUNCE_MS = 180

function statusLabel(status: string | null) {
  if (!status) return NO_STATUS_LABEL
  return isLeadStatus(status) ? LEAD_STATUS_SHORT[status] : status
}

const optionTone = {
  active: "bg-surface-sunken",
  idle: "",
} as const

/**
 * Lead search (DESIGN.md "Sidebar" item 2). A modal <dialog>: the browser traps
 * focus, Escape closes it and focus returns to the control that opened it. The
 * input is a combobox over a listbox: arrows move, Enter opens the lead.
 */
export function CommandPalette({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const router = useRouter()
  const listId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Results>({ kind: "idle" })
  const [active, setActive] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(0)

  const hits = results.kind === "done" || results.kind === "loading" ? results.hits : []

  const search = (value: string) => {
    setQuery(value)
    setActive(0)
    clearTimeout(timer.current)
    if (!value.trim()) {
      latest.current += 1
      setResults({ kind: "idle" })
      return
    }
    setResults({ kind: "loading", hits })
    timer.current = setTimeout(async () => {
      const call = ++latest.current
      const result = await searchLeadsAction(value).catch(() => ({ ok: false as const }))
      if (call !== latest.current) return
      setResults(result.ok ? { kind: "done", hits: result.hits, term: value.trim(), more: result.more } : { kind: "error" })
    }, DEBOUNCE_MS)
  }

  const open = (hit: LeadHit) => {
    ref.current?.close()
    router.push(`/customers/${hit.id}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && hits.length > 0) {
      event.preventDefault()
      setActive((active + 1) % hits.length)
    } else if (event.key === "ArrowUp" && hits.length > 0) {
      event.preventDefault()
      setActive((active - 1 + hits.length) % hits.length)
    } else if (event.key === "Enter" && hits[active]) {
      event.preventDefault()
      open(hits[active])
    }
  }

  const reset = () => {
    clearTimeout(timer.current)
    latest.current += 1
    setQuery("")
    setResults({ kind: "idle" })
    setActive(0)
  }

  const optionId = (index: number) => `${listId}-${index}`

  return (
    <dialog
      ref={ref}
      aria-label="Search leads"
      onClose={reset}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className="mx-auto mt-4 w-[calc(100vw-32px)] max-w-[560px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-raised p-0 text-ink shadow-xl backdrop:bg-scrim/40 md:mt-[12vh]"
    >
      {/* Focus shows as a 2px accent rule under the field instead of a box around the bare input. */}
      <div className="flex items-center gap-3 border-b border-line px-4 focus-within:shadow-[inset_0_-2px_0_var(--accent)]">
        <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} />
        <input
          type="text"
          role="combobox"
          aria-label="Search leads by name, phone or business"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={hits[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Name, phone or business"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none md:text-[15px]"
        />
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors duration-[120ms] hover:bg-surface-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-[18px]" />
          <span className="sr-only">Close search</span>
        </button>
      </div>

      <ul id={listId} role="listbox" aria-label="Leads" className="max-h-[min(400px,60dvh)] overflow-y-auto p-1.5 empty:hidden">
        {hits.map((hit, index) => (
          <li
            key={hit.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            onClick={() => open(hit)}
            onMouseMove={() => setActive(index)}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 ${optionTone[index === active ? "active" : "idle"]}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{leadName(hit.customer_name)}</span>
              <span className="block truncate text-xs text-muted">
                {[hit.phone, hit.business].filter(Boolean).join(" · ") || "No phone or business"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted">{statusLabel(hit.status)}</span>
          </li>
        ))}
      </ul>

      <p role="status" aria-live="polite" className="px-4 py-3 text-xs text-muted empty:hidden">
        <PaletteStatus results={results} />
      </p>
    </dialog>
  )
}

function PaletteStatus({ results }: { results: Results }) {
  if (results.kind === "idle") return "Type to search your leads. Enter opens the highlighted one."
  if (results.kind === "loading") return "Searching..."
  if (results.kind === "error") return "Search failed. Check your connection and try again."
  if (results.hits.length === 0) return `No lead matches "${results.term}".`
  if (results.more) return `First ${results.hits.length} by name. Type more to narrow it down.`
  return results.hits.length === 1 ? "1 lead found." : `${results.hits.length} leads found.`
}
