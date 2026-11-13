import { Check, CircleAlert, Minus, X, type LucideIcon } from "lucide-react"
import type { LineTone, SummaryLine } from "./booking-model"

// What happened, one line per step. Warnings (not connected, no address) sit on
// amber, failures on pink; the icon and a hidden word repeat the tone in text.
const ROW: Record<LineTone, string> = {
  ok: "",
  info: "text-muted",
  warn: "bg-warning-soft",
  fail: "bg-negative-soft",
}

const ICON: Record<LineTone, { icon: LucideIcon; tone: string; word: string }> = {
  ok: { icon: Check, tone: "text-positive", word: "Done" },
  info: { icon: Minus, tone: "text-muted", word: "Note" },
  warn: { icon: CircleAlert, tone: "text-warning", word: "Warning" },
  fail: { icon: X, tone: "text-negative", word: "Failed" },
}

export function ResultSummary({ lines }: { lines: SummaryLine[] }) {
  return (
    <ul role="status" className="flex flex-col gap-1 text-sm">
      {lines.map((line) => {
        const { icon: Icon, tone, word } = ICON[line.tone]
        return (
          <li key={line.key} className={`flex items-start gap-2.5 rounded-[var(--radius-control)] px-3 py-2 ${ROW[line.tone]}`}>
            <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${tone}`} strokeWidth={2} />
            <span className="min-w-0 break-words">
              <span className="sr-only">{word}: </span>
              {line.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
