"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === "light" || set === "dark") return set
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", listener)
  return () => {
    listeners.delete(listener)
    media.removeEventListener("change", listener)
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => "light")
  const next: Theme = theme === "dark" ? "light" : "dark"
  const Icon = theme === "dark" ? Sun : Moon

  const toggle = () => {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem("fsi-theme", next)
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    listeners.forEach((listener) => listener())
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm text-ink transition-colors duration-150 hover:bg-surface md:min-h-10"
    >
      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      {next === "dark" ? "Dark theme" : "Light theme"}
    </button>
  )
}
