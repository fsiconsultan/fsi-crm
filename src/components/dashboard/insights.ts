import type { Dashboard } from "@/lib/data/dashboard"
import { STALE_DAYS, leadsHref } from "@/lib/leads/filters"
import { LEAD_STATUS_SHORT, OPEN_STATUSES } from "@/lib/leads/status"
import { n, percent, plural } from "./format"

export type Insight = {
  /** The big number, e.g. "57%". */
  value: string
  /** Its caption, to the right of the number. */
  caption: string
  headline: string
  body: string
  action: string
  href: string
}

// Statements computed from the counts on this page. One that has nothing real
// to say is left out; with none left the card is not rendered at all.
export function buildInsights(data: Dashboard, salesId: string): Insight[] {
  const insights: Insight[] = []

  const busiest = OPEN_STATUSES.reduce((top, status) =>
    data.byStatus[status] > data.byStatus[top] ? status : top,
  )
  if (data.byStatus[busiest] > 0 && data.open > data.byStatus[busiest]) {
    const stage = LEAD_STATUS_SHORT[busiest]
    insights.push({
      value: percent(data.byStatus[busiest], data.open) ?? "0%",
      caption: "of the open pipeline",
      headline: `Most open leads sit at ${stage.toLowerCase()}`,
      body: `${n(data.byStatus[busiest])} of the ${n(data.open)} open leads are at this stage, longest waiting first in the list.`,
      action: `Review ${stage.toLowerCase()} leads`,
      href: leadsHref({ status: busiest, sales: salesId, sort: "longest" }),
    })
  }

  if (data.stale > 0 && data.open > 0) {
    insights.push({
      value: percent(data.stale, data.open) ?? "0%",
      caption: `of open leads idle for ${STALE_DAYS}+ days`,
      headline: `${plural(data.stale, "open lead has", "open leads have")} not moved in ${STALE_DAYS} days`,
      body: "Their status has stayed the same for longer than two weeks. Leads with no status date are not counted.",
      action: `Review ${plural(data.stale, "stuck lead", "stuck leads")}`,
      href: leadsHref({ view: "stale", sales: salesId, sort: "longest" }),
    })
  }

  const thisWeek = data.weeks.at(-1)
  const lastWeek = data.weeks.at(-2)
  if (thisWeek && lastWeek && thisWeek.count + lastWeek.count > 0) {
    const headline =
      thisWeek.count > lastWeek.count
        ? "This week has already passed last week"
        : thisWeek.count === lastWeek.count
          ? "This week has matched last week so far"
          : "This week is behind last week so far"
    insights.push({
      value: n(thisWeek.count),
      caption: "new leads so far this week",
      headline,
      body: `${plural(lastWeek.count, "lead was", "leads were")} added in the whole of last week. Counted by the day each lead was added.`,
      action: "See this week's leads",
      href: leadsHref({ from: thisWeek.start, sales: salesId, sort: "newest" }),
    })
  }

  return insights
}
