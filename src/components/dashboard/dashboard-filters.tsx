"use client"

import Link from "next/link"
import { useState, useTransition, type ReactNode } from "react"
import { CalendarDays, Check, ChevronDown, Download, Users, type LucideIcon } from "lucide-react"
import { exportOverviewCsv } from "@/app/(app)/actions"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { pillClass } from "@/components/ui/pill"

export type FilterOption = { label: string; href: string; checked: boolean }

const checkTone = { on: "text-ink", off: "invisible" } as const

function OptionItems({ options, close }: { options: FilterOption[]; close: () => void }) {
  return options.map((option) => (
    <Link
      key={option.href}
      href={option.href}
      role="menuitemradio"
      aria-checked={option.checked}
      tabIndex={-1}
      onClick={close}
      className={menuItemClass}
    >
      <Check aria-hidden="true" className={`size-4 shrink-0 ${checkTone[option.checked ? "on" : "off"]}`} />
      <span className="truncate">{option.label}</span>
    </Link>
  ))
}

// The Overview's header controls (DESIGN.md "Page header controls"): menu
// buttons, not native selects. Each choice is a link, so the URL stays the
// source of truth for the range and the person.
export function DashboardFilters({
  range,
  compare,
  periods,
  scope,
  exportInput,
}: {
  /** "14 Oct to 12 Nov" */
  range: string
  /** "14 Sep to 13 Oct" when a comparison with the period before is shown; null hides it. */
  compare: string | null
  periods: FilterOption[]
  /** Admin only: the salesperson menu. */
  scope: Scope | null
  exportInput: { period: string; sales: string }
}) {
  return (
    <>
      <div className="flex h-11 min-w-0 items-center gap-1 rounded-full bg-line/70 p-1 md:h-10">
        <Menu
          label="Date range"
          placement="below-end"
          triggerClassName={pillClass("raised", "h-9 gap-2 px-3 md:h-8")}
          trigger={
            <>
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="tabular-nums">{range}</span>
              <span className="sr-only">, change the date range</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
            </>
          }
        >
          {(close) => <OptionItems options={periods} close={close} />}
        </Menu>
        {compare ? <span className="truncate px-2 text-[13px] text-muted tabular-nums max-sm:hidden">vs {compare}</span> : null}
      </div>

      {scope ? <ScopeMenu scope={scope} /> : null}

      <ExportButton input={exportInput} range={range} />
    </>
  )
}

export type Scope = { label: string; options: FilterOption[] }

/** A header pill that opens a menu of links: icon, the current choice, chevron. */
export function PillMenu({
  menuLabel,
  icon: Icon,
  text,
  hint,
  options,
  extra,
}: {
  /** Accessible name of the menu, for example "Salesperson". */
  menuLabel: string
  icon: LucideIcon
  /** The current choice, shown on the pill. */
  text: string
  /** Read after the choice by screen readers, for example ", change whose leads are shown". */
  hint: string
  options: FilterOption[]
  /** More menu items after the options, for example one that opens a dialog. */
  extra?: (close: () => void) => ReactNode
}) {
  return (
    <Menu
      label={menuLabel}
      placement="below-end"
      triggerClassName={pillClass("tinted", "max-w-[60vw] md:max-w-64")}
      trigger={
        <>
          <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{text}</span>
          <span className="sr-only">{hint}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        </>
      }
    >
      {(close) => (
        <>
          <OptionItems options={options} close={close} />
          {extra?.(close)}
        </>
      )}
    </Menu>
  )
}

/** The Admin's salesperson pill, shared by the Overview and the Pipeline page. */
export function ScopeMenu({ scope }: { scope: Scope }) {
  return (
    <PillMenu
      menuLabel="Salesperson"
      icon={Users}
      text={scope.label}
      hint=", change whose leads are shown"
      options={scope.options}
    />
  )
}

function ExportButton({ input, range }: { input: { period: string; sales: string }; range: string }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: "error" | "done"; text: string } | null>(null)

  const run = () =>
    startTransition(async () => {
      setMessage(null)
      const result = await exportOverviewCsv(input).catch(() => null)
      if (!result || !result.ok) {
        setMessage({ tone: "error", text: result?.error ?? "The export failed. Check your connection and try again." })
        return
      }
      // A byte order mark so Excel reads the names as UTF-8.
      const url = URL.createObjectURL(new Blob(["﻿", result.csv], { type: "text/csv;charset=utf-8" }))
      const link = document.createElement("a")
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)
      setMessage({ tone: "done", text: result.count === 1 ? "1 lead exported." : `${result.count.toLocaleString("en-US")} leads exported.` })
    })

  return (
    <div className="relative">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title={`Download the leads added ${range} as a CSV file`}
        className={pillClass("tinted")}
      >
        <Download aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        {pending ? "Exporting..." : "Export"}
        <span className="sr-only"> the leads added {range} as a CSV file</span>
      </button>
      <p role="status" aria-live="polite" className={MESSAGE_TONE[message?.tone ?? "done"]}>
        {message?.text}
      </p>
    </div>
  )
}

const MESSAGE_TONE = {
  done: "absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-muted empty:hidden",
  error: "absolute right-0 top-full z-10 mt-1 w-64 rounded-[8px] bg-negative-soft px-2 py-1 text-xs text-negative empty:hidden",
} as const
