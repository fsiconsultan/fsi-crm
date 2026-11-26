// leads.notes is free text shared with the legacy CRM, so it is never rewritten.
// For display only, entries the website appends ("2026-11-26 13:06 WITA: Quote
// request from the website" followed by "Label: value" lines) are split into
// blocks; anything else stays a plain paragraph exactly as typed.

export type NoteLine = { label: string | null; text: string; href?: string }
export type NoteBlock =
  | { kind: "entry"; title: string; when: string; lines: NoteLine[] }
  | { kind: "text"; text: string }

const STAMP = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2} WITA): (.+)$/
const LABELED = /^([A-Z][A-Za-z ]{1,20}): (.+)$/
const MAP = /^https:\/\/www\.google\.com\/maps\?q=[-\d.,]+$/

export function noteBlocks(notes: string | null): NoteBlock[] {
  const text = notes?.trim()
  if (!text) return []
  return text.split(/\n\s*\n/).map((chunk): NoteBlock => {
    const [first, ...rest] = chunk.split("\n")
    const stamp = STAMP.exec(first.trim())
    if (!stamp) return { kind: "text", text: chunk }
    const lines = rest.filter((line) => line.trim()).map((line): NoteLine => {
      const labeled = LABELED.exec(line.trim())
      if (!labeled) return { label: null, text: line.trim() }
      const [, label, value] = labeled
      if (label === "Map" && MAP.test(value)) return { label, text: "Open map", href: value }
      return { label, text: value }
    })
    return { kind: "entry", when: stamp[1], title: stamp[2], lines }
  })
}
