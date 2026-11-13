"use client"

import { useState, type FocusEvent } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Menu, menuItemClass } from "./menu"
import { pillClass } from "./pill"

export type PillSelectOption = { value: string; label: string }

const checkTone = { on: "text-ink", off: "invisible" } as const

// Focus that lands on the wrapper (a dialog's [data-autofocus]) moves on to the pill.
function forwardFocus(event: FocusEvent<HTMLDivElement>) {
  if (event.target === event.currentTarget) event.currentTarget.querySelector("button")?.focus()
}

/**
 * A form field in the reference pill style instead of a native <select>: a pill
 * button with the current choice opens a menu (keyboard as in <Menu>), and a
 * hidden input carries the value, so it posts with the form like a select.
 * Uncontrolled: remount it (key) to take a new `defaultValue`.
 */
export function PillSelect({
  name,
  label,
  defaultValue,
  options,
  error,
  autoFocus = false,
  onChange,
}: {
  name: string
  label: string
  defaultValue: string
  options: PillSelectOption[]
  error?: string
  /** Marks this field as the one a dialog focuses when it opens. */
  autoFocus?: boolean
  onChange?: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  const current = options.find((option) => option.value === value)?.label ?? value

  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 outline-none"
      data-autofocus={autoFocus || undefined}
      tabIndex={autoFocus ? -1 : undefined}
      onFocus={autoFocus ? forwardFocus : undefined}
    >
      <span aria-hidden="true" className="text-sm font-medium">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <Menu
        label={label}
        triggerLabel={`${label}: ${current}${error ? `. ${error}` : ""}`}
        triggerClassName={pillClass("tinted", "w-full justify-between")}
        placement="floating"
        menuClassName="md:w-64"
        trigger={
          <>
            <span className="truncate">{current}</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
          </>
        }
      >
        {(close) =>
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              tabIndex={-1}
              onClick={() => {
                setValue(option.value)
                onChange?.(option.value)
                close()
              }}
              className={menuItemClass}
            >
              <Check aria-hidden="true" className={`size-4 shrink-0 ${checkTone[option.value === value ? "on" : "off"]}`} />
              <span className="truncate">{option.label}</span>
            </button>
          ))
        }
      </Menu>
      {error ? <p className="text-[13px] text-negative">{error}</p> : null}
    </div>
  )
}
