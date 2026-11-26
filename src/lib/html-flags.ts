// Per-browser display choices kept as data attributes on <html> (set before paint
// by the root layout script) and in localStorage. Read them with
// useSyncExternalStore(subscribeHtmlFlags, () => readHtmlFlag(key), () => fallback).

export type HtmlFlag = "theme" | "sidebar"

const STORAGE_KEYS: Record<HtmlFlag, string> = { theme: "fsi-theme", sidebar: "fsi-sidebar" }

const listeners = new Set<() => void>()

export function subscribeHtmlFlags(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readHtmlFlag(flag: HtmlFlag) {
  return document.documentElement.dataset[flag] ?? ""
}

export function writeHtmlFlag(flag: HtmlFlag, value: string) {
  const root = document.documentElement
  if (value) root.dataset[flag] = value
  else delete root.dataset[flag]
  try {
    if (value) localStorage.setItem(STORAGE_KEYS[flag], value)
    else localStorage.removeItem(STORAGE_KEYS[flag])
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  listeners.forEach((listener) => listener())
}
