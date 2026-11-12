"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Insight } from "./insights"

const pagerButton =
  "flex size-11 items-center justify-center rounded-[var(--radius-control)] text-white transition-colors duration-150 hover:bg-white/15 focus-visible:outline-white"

// The one gradient on the page (DESIGN.md): it sets computed observations
// apart from the plain counts around it. Text stays in the navy upper half.
export function InsightCard({ insights }: { insights: Insight[] }) {
  const [index, setIndex] = useState(0)
  const insight = insights[Math.min(index, insights.length - 1)]
  const step = (amount: number) =>
    setIndex((current) => (current + amount + insights.length) % insights.length)

  return (
    <section
      aria-label="Insights"
      className="insight-gradient flex min-h-[300px] flex-col rounded-[var(--radius-card)] p-4 text-white md:min-h-[340px] md:p-6"
    >
      <header className="-mr-2 flex md:-mt-2 min-h-11 items-center justify-between gap-3">
        <h2 className="text-[17px] font-medium leading-6">Worth knowing</h2>
        {insights.length > 1 ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[13px] tabular-nums" aria-live="polite">
              {index + 1} of {insights.length}
            </span>
            <button type="button" onClick={() => step(-1)} className={pagerButton}>
              <ChevronLeft aria-hidden="true" className="size-5" />
              <span className="sr-only">Previous insight</span>
            </button>
            <button type="button" onClick={() => step(1)} className={pagerButton}>
              <ChevronRight aria-hidden="true" className="size-5" />
              <span className="sr-only">Next insight</span>
            </button>
          </div>
        ) : null}
      </header>

      <p aria-live="polite" className="mt-3 max-w-[30ch] text-[19px] leading-7">
        {insight.text}
      </p>

      <Link
        href={insight.href}
        className="mt-auto inline-flex min-h-11 items-center self-start rounded-[var(--radius-control)] bg-white px-4 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90 focus-visible:outline-white md:min-h-10"
      >
        {insight.action}
      </Link>
    </section>
  )
}
