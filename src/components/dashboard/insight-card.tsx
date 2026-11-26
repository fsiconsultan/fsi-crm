"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react"
import type { Insight } from "./insights"

const pagerButton =
  "reveal-on-hover flex size-11 items-center justify-center rounded-full text-on-insight transition-colors duration-[120ms] hover:bg-on-insight/15 focus-visible:opacity-100 focus-visible:outline-on-insight md:size-8"

// The one gradient on the page (DESIGN.md "Insight card"): it sets computed
// observations apart from the plain counts around it. Text stays in the navy
// upper left; the sun corner only holds the white button and the light arc.
export function InsightCard({ insights }: { insights: Insight[] }) {
  const [index, setIndex] = useState(0)
  const insight = insights[Math.min(index, insights.length - 1)]
  const step = (amount: number) => setIndex((current) => (current + amount + insights.length) % insights.length)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Worth knowing"
      className="insight-gradient group relative isolate flex h-full min-h-[360px] flex-col md:min-h-[300px] overflow-hidden rounded-[var(--radius-card)] p-5 text-on-insight"
    >
      {/* The soft light arc of the reference: decoration only. */}
      <span aria-hidden="true" className="absolute -right-14 -bottom-36 -z-10 size-56 rounded-full xl:-bottom-24 border border-on-insight/40 bg-on-insight/10" />
      <span aria-hidden="true" className="absolute right-6 -bottom-6 -z-10 h-28 w-12 rounded-t-[10px] border border-on-insight/35 border-b-0" />

      <header className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 rounded-full border border-on-insight/40 bg-on-insight/10 px-2.5 py-1 text-xs font-medium">
          <Lightbulb aria-hidden="true" className="size-3.5" strokeWidth={2} />
          Worth knowing
        </h2>
        {insights.length > 1 ? (
          <div className="-mr-2 flex items-center">
            <button type="button" onClick={() => step(-1)} className={pagerButton}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span className="sr-only">Previous insight</span>
            </button>
            <span className="px-1 text-xs tabular-nums text-on-insight/85">
              {index + 1} of {insights.length}
            </span>
            <button type="button" onClick={() => step(1)} className={pagerButton}>
              <ChevronRight aria-hidden="true" className="size-4" />
              <span className="sr-only">Next insight</span>
            </button>
          </div>
        ) : null}
      </header>

      <div aria-live="polite" className="mt-4">
        <p className="flex items-end gap-3">
          <span className="text-[48px] font-normal leading-none tracking-[-0.03em] tabular-nums">{insight.value}</span>
          <span className="mb-1 max-w-[16ch] text-xs leading-4 text-on-insight/85">{insight.caption}</span>
        </p>
        <p className="mt-4 max-w-[26ch] text-[19px] font-medium leading-6">{insight.headline}</p>
        <p className="mt-2 max-w-[32ch] text-[13px] leading-5 text-on-insight/85">{insight.body}</p>
      </div>

      <Link
        href={insight.href}
        className="mt-auto inline-flex min-h-11 items-center gap-1 self-start rounded-full bg-on-insight pr-3 pl-4 text-sm font-medium text-on-insight-ink transition-colors duration-[120ms] hover:bg-on-insight/90 focus-visible:outline-on-insight md:min-h-10"
      >
        {insight.action}
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  )
}
