import type { Dashboard } from "@/lib/data/dashboard"
import { leadsHref } from "@/lib/leads/filters"
import { LEAD_STATUS_SHORT, OPEN_STATUSES } from "@/lib/leads/status"
import { n, percent, plural } from "./format"

export type Insight = { text: string; action: string; href: string }

// Statements computed from the counts on this page. One that has nothing real
// to say is left out; with none left the card is not rendered at all.
export function buildInsights(data: Dashboard, salesId: string): Insight[] {
  const insights: Insight[] = []

  const busiest = OPEN_STATUSES.reduce((top, status) =>
    data.byStatus[status] > data.byStatus[top] ? status : top,
  )
  if (data.byStatus[busiest] > 0 && data.open > data.byStatus[busiest]) {
    insights.push({
      text: `${LEAD_STATUS_SHORT[busiest]} holds ${n(data.byStatus[busiest])} of the ${n(data.open)} leads in the pipeline, ${percent(data.byStatus[busiest], data.open)} of it.`,
      action: `Open ${LEAD_STATUS_SHORT[busiest].toLowerCase()} leads`,
      href: leadsHref({ status: busiest, sales: salesId, sort: "longest" }),
    })
  }

  const thisWeek = data.weeks.at(-1)
  const lastWeek = data.weeks.at(-2)
  if (thisWeek && lastWeek && thisWeek.count + lastWeek.count > 0) {
    insights.push({
      text: `${plural(thisWeek.count, "lead", "leads")} added so far this week, against ${n(lastWeek.count)} in the whole of last week.`,
      action: "See this week's leads",
      href: leadsHref({ from: thisWeek.start, sales: salesId, sort: "newest" }),
    })
  }

  const won = data.byStatus["Deal"]
  const closed = won + data.byStatus["No Deal"]
  if (closed > 0) {
    insights.push({
      text: `Of the ${plural(closed, "lead", "leads")} closed so far, ${n(won)} became ${won === 1 ? "a deal" : "deals"}: ${percent(won, closed)}.`,
      action: "See the deals",
      href: leadsHref({ status: "Deal", sales: salesId }),
    })
  }

  return insights
}
