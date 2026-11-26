"use client"

import { useSyncExternalStore } from "react"
import { Moon } from "lucide-react"
import { menuItemClass } from "@/components/ui/menu"
import { readHtmlFlag, subscribeHtmlFlags, writeHtmlFlag } from "@/lib/html-flags"

// Light is the default for everyone (DESIGN.md "Theme"); dark is a choice
// remembered per browser. A checkbox item in the profile menu: it stays open
// so the change is visible right away.
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeHtmlFlags, () => readHtmlFlag("theme") === "dark", () => false)

  const toggle = () => {
    writeHtmlFlag("theme", dark ? "" : "dark")
    // Browser chrome follows the canvas of the theme now showing.
    const canvas = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", canvas)
  }

  return (
    <button type="button" role="menuitemcheckbox" aria-checked={dark} tabIndex={-1} onClick={toggle} className={menuItemClass}>
      <Moon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1">Dark theme</span>
      <span
        aria-hidden="true"
        data-on={dark}
        className="group/switch relative h-5 w-9 shrink-0 rounded-full bg-muted transition-colors duration-[120ms] data-[on=true]:bg-accent"
      >
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-surface-raised transition-transform duration-[120ms] group-data-[on=true]/switch:translate-x-4" />
      </span>
    </button>
  )
}
