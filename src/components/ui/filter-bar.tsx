"use client"

import Form from "next/form"
import Link from "next/link"
import { useState, type KeyboardEvent } from "react"
import {
  ArrowDownUp,
  ArrowRightLeft,
  CalendarPlus,
  Check,
  CircleDot,
  Search,
  SlidersHorizontal,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { PillMenu, type FilterOption } from "@/components/dashboard/dashboard-filters"
import { Button } from "@/components/ui/button"
import { controlClass } from "@/components/ui/control"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { menuItemClass } from "@/components/ui/menu"
import { pillClass } from "@/components/ui/pill"

export type FilterGroupKey = "sales" | "type" | "mover" | "added" | "status" | "sort"

/** A start and end day typed by hand, sent as a GET form with the other params kept. */
export type DateRange = {
  from: string
  to: string
  /** The two param names, for example "from" and "to". */
  names: [string, string]
  /** Every other param of the current URL, so applying the range keeps them. */
  keep: Array<[string, string]>
}

export type FilterGroup = {
  key: FilterGroupKey
  /** Name of the filter: the menu's accessible name and the heading in the phone sheet. */
  name: string
  /** The current choice, shown on the pill. */
  text: string
  options: FilterOption[]
  /** Adds "Pick dates" to the menu and the date fields to the phone sheet. */
  range?: DateRange
}

export type FilterChip = { key: string; label: string; removeHref: string }

// People for whose leads, a tag for the kind of lead, two arrows for who moved it,
// a calendar for when it was added, a dot for the stage, up and down arrows for the order.
const ICONS: Record<FilterGroupKey, LucideIcon> = {
  sales: Users,
  type: Tag,
  mover: ArrowRightLeft,
  added: CalendarPlus,
  status: CircleDot,
  sort: ArrowDownUp,
}

const checkTone = { on: "text-ink", off: "invisible" } as const

// With a sort pill there are three controls on a phone, so the search takes a
// row of its own and Filters and the sort share the next one.
const searchWidth = {
  ownRow: "basis-full md:w-64 md:basis-auto",
  shared: "flex-[1_1_12rem] md:w-64 md:flex-none",
} as const

// Links answer Enter; a switch answers Space too.
function clickOnSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== " ") return
  event.preventDefault()
  event.currentTarget.click()
}

function Toggle({ option }: { option: FilterOption }) {
  return (
    <Link
      href={option.href}
      role="switch"
      aria-checked={option.checked}
      onKeyDown={clickOnSpace}
      className={pillClass(option.checked ? "on" : "tinted")}
    >
      {option.label}
    </Link>
  )
}

function GroupPill({ group, onPickDates }: { group: FilterGroup; onPickDates: (group: FilterGroup) => void }) {
  const { range } = group
  return (
    <PillMenu
      menuLabel={group.name}
      icon={ICONS[group.key]}
      text={group.text}
      hint={`, change the filter: ${group.name}`}
      options={group.options}
      extra={
        range
          ? (close) => (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close()
                  onPickDates(group)
                }}
                className={menuItemClass}
              >
                <Check aria-hidden="true" className="invisible size-4 shrink-0" />
                Pick dates…
              </button>
            )
          : undefined
      }
    />
  )
}

/** Two date fields as a GET form; used in the "Pick dates" dialog and in the phone sheet. */
function RangeForm({
  action,
  range,
  id,
  onDone,
}: {
  action: string
  range: DateRange
  id: string
  onDone: () => void
}) {
  return (
    <Form id={id} action={action} onSubmit={onDone} className="grid grid-cols-2 gap-3">
      {range.keep.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Field htmlFor={`${id}-from`} label="From">
        <input id={`${id}-from`} name={range.names[0]} type="date" defaultValue={range.from} className={controlClass} />
      </Field>
      <Field htmlFor={`${id}-to`} label="To">
        <input id={`${id}-to`} name={range.names[1]} type="date" defaultValue={range.to} className={controlClass} />
      </Field>
    </Form>
  )
}

/**
 * A page's filter bar in the header pill style (DESIGN.md "Pipeline page" and
 * "Leads page"). Every choice is a link and the search is a GET form, so the
 * URL holds the filters: they survive a reload and can be shared. From md up
 * the filters are pills with menus; on a phone they fold into one "Filters"
 * pill that opens a bottom sheet, and the search and the sort stay visible.
 */
export function FilterBar({
  action,
  q,
  searchLabel,
  keep,
  groups,
  toggles = [],
  sort,
  chips,
  clearHref,
  doneLabel,
}: {
  /** The page path the search form submits to. */
  action: string
  q: string
  /** Accessible name of the search box. */
  searchLabel: string
  /** The other params the search form carries along. */
  keep: Array<[string, string]>
  groups: FilterGroup[]
  toggles?: FilterOption[]
  /** The order menu, kept beside the search on phones. */
  sort?: FilterGroup
  chips: FilterChip[]
  clearHref: string
  /** The sheet's close button, naming what the page shows. */
  doneLabel: string
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [rangeGroup, setRangeGroup] = useState<FilterGroup | null>(null)
  // The search has its own box, so the sheet's count leaves it out.
  const inSheet = chips.filter((chip) => chip.key !== "q").length
  const searchId = `${action.replace(/\W/g, "")}-q`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Remount when the search is cleared from a chip, so the box empties too. */}
        <Form key={q} action={action} role="search" className={`relative min-w-0 ${searchWidth[sort ? "ownRow" : "shared"]}`}>
          {keep.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            id={searchId}
            name="q"
            type="search"
            defaultValue={q}
            maxLength={80}
            placeholder="Name, phone or business"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-[color-mix(in_srgb,var(--muted)_75%,transparent)] bg-surface-raised pl-10 pr-4 text-base text-ink placeholder:text-muted md:h-10 md:text-sm"
          />
          {/* Enter in the box submits; this button only serves assistive tech, so it stays out of the Tab order. */}
          <button type="submit" tabIndex={-1} className="sr-only">
            Search
          </button>
        </Form>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {groups.map((group) => (
            <GroupPill key={group.key} group={group} onPickDates={setRangeGroup} />
          ))}
          {toggles.map((option) => (
            <Toggle key={option.label} option={option} />
          ))}
        </div>

        <button type="button" onClick={() => setSheetOpen(true)} className={pillClass("tinted", "md:hidden")}>
          <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          Filters
          {inSheet > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs tabular-nums text-ink-contrast">
              {inSheet}
              <span className="sr-only"> active</span>
            </span>
          ) : null}
        </button>

        {sort ? (
          <div className="md:ml-auto">
            <GroupPill group={sort} onPickDates={setRangeGroup} />
          </div>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key} className="min-w-0 max-w-full">
              <Link
                href={chip.removeHref}
                aria-label={`Remove filter: ${chip.label}`}
                className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-raised pl-3 pr-2 text-[13px] text-ink transition-colors duration-[120ms] hover:bg-surface-sunken md:min-h-8"
              >
                <span className="truncate">{chip.label}</span>
                <X aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={clearHref}
              className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium underline decoration-line underline-offset-4 hover:decoration-ink md:min-h-8"
            >
              Clear all
            </Link>
          </li>
        </ul>
      ) : null}

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <div className="flex flex-col gap-5 pb-4">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`filter-${group.key}`}>
              <h3 id={`filter-${group.key}`} className="mb-1 text-xs text-muted">
                {group.name}
              </h3>
              <ul>
                {group.options.map((option) => (
                  <li key={option.href}>
                    <Link href={option.href} aria-current={option.checked ? "true" : undefined} className={menuItemClass}>
                      <Check aria-hidden="true" className={`size-4 shrink-0 ${checkTone[option.checked ? "on" : "off"]}`} />
                      <span className="truncate">{option.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {group.range ? (
                <div className="mt-2 flex flex-col gap-2 px-3">
                  <RangeForm
                    action={action}
                    range={group.range}
                    id={`sheet-${group.key}`}
                    onDone={() => setSheetOpen(false)}
                  />
                  <Button type="submit" form={`sheet-${group.key}`} variant="secondary" className="self-start">
                    Use these dates
                  </Button>
                </div>
              ) : null}
            </section>
          ))}
          {toggles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {toggles.map((option) => (
                <Toggle key={option.label} option={option} />
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Link href={clearHref} className={pillClass("tinted", "justify-center")}>
            Clear all
          </Link>
          <Button variant="primary" onClick={() => setSheetOpen(false)}>
            {doneLabel}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={rangeGroup !== null}
        onClose={() => setRangeGroup(null)}
        title={rangeGroup ? `${rangeGroup.name}: pick dates` : ""}
        description="Both days are included. Leave one empty to keep that side open."
      >
        {rangeGroup?.range ? <RangeForm action={action} range={rangeGroup.range} id="range-dialog" onDone={() => setRangeGroup(null)} /> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setRangeGroup(null)}>
            Cancel
          </Button>
          <Button type="submit" form="range-dialog" variant="primary">
            Use these dates
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
