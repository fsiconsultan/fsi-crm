import { Suspense } from "react"
import { PipelineFilterBar, type FilterGroup } from "@/components/pipeline/pipeline-filters"
import { PipelineSection } from "@/components/pipeline/pipeline-section"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { ErrorState, LoadingState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { listSalesUsers } from "@/lib/data/leads"
import { LEAD_TYPES } from "@/lib/leads/status"
import {
  ADDED_RANGES,
  DUE_LABEL,
  MOVERS,
  STUCK_LABEL,
  activeChips,
  parsePipelineFilters,
  pipelineHref,
  type PipelineFilters,
} from "@/lib/pipeline/filters"

export const metadata = { title: "Pipeline" }

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const raw = await searchParams
  const profile = await getProfile()
  const admin = isAdmin(profile)

  // Admin sees the team and can narrow to one person. Everyone else gets their own leads from RLS.
  const team = admin ? await listSalesUsers().catch(() => null) : null
  const parsed = parsePipelineFilters(raw)
  const selected = team?.find((user) => user.id === parsed.sales)
  // A salesperson in the URL only counts when this viewer may pick one and that person exists.
  const filters: PipelineFilters = { ...parsed, sales: selected?.id ?? "" }
  const here = pipelineHref(filters)

  const group = <K extends "type" | "mover" | "added">(
    key: K,
    name: string,
    any: string,
    choices: Array<{ value: PipelineFilters[K]; label: string; text: string }>,
  ): FilterGroup => ({
    key,
    name,
    text: choices.find((choice) => choice.value === filters[key])?.text ?? any,
    options: [
      { label: any, href: pipelineHref({ ...filters, [key]: "" }), checked: !filters[key] },
      ...choices.map((choice) => ({
        label: choice.label,
        href: pipelineHref({ ...filters, [key]: choice.value }),
        checked: choice.value === filters[key],
      })),
    ],
  })

  const groups: FilterGroup[] = [
    ...(team
      ? [
          {
            key: "sales" as const,
            name: "Salesperson",
            text: selected?.name ?? "Whole team",
            options: [
              { label: "Whole team", href: pipelineHref({ ...filters, sales: "" }), checked: !selected },
              ...team.map((user) => ({
                label: user.name,
                href: pipelineHref({ ...filters, sales: user.id }),
                checked: user.id === selected?.id,
              })),
            ],
          },
        ]
      : []),
    group(
      "type",
      "Lead type",
      "Any type",
      LEAD_TYPES.map((type) => ({ value: type, label: type, text: type })),
    ),
    group("mover", "Moved last by", "Moved by anyone", [
      { value: "ai", label: MOVERS.ai, text: `Moved by ${MOVERS.ai}` },
      { value: "person", label: MOVERS.person, text: "Moved by a person" },
    ]),
    group("added", "Added", "Added any time", [
      { value: "7", label: ADDED_RANGES["7"], text: `Added: ${ADDED_RANGES["7"].toLowerCase()}` },
      { value: "30", label: ADDED_RANGES["30"], text: `Added: ${ADDED_RANGES["30"].toLowerCase()}` },
      { value: "90", label: ADDED_RANGES["90"], text: `Added: ${ADDED_RANGES["90"].toLowerCase()}` },
    ]),
  ]

  return (
    <>
      <PageHeader title="Pipeline" />
      <PipelineFilterBar
        filters={filters}
        groups={groups}
        toggles={[
          { label: STUCK_LABEL, href: pipelineHref({ ...filters, stuck: !filters.stuck }), checked: filters.stuck },
          { label: DUE_LABEL, href: pipelineHref({ ...filters, due: !filters.due }), checked: filters.due },
        ]}
        chips={activeChips(filters, selected?.name ?? null)}
      />
      {admin && team === null ? (
        <div className="mb-3">
          <ErrorState
            title="The sales team list could not be loaded"
            detail="The board shows the whole team, but the salesperson filter and the names on the cards are missing. Reload to try again."
          />
        </div>
      ) : null}
      <Suspense
        key={here}
        fallback={
          <Card className="max-md:p-4">
            <LoadingState label="Loading the pipeline…" />
          </Card>
        }
      >
        <PipelineSection
          filters={filters}
          owners={team ? new Map(team.map((user) => [user.id, user.name])) : null}
          retryHref={here}
        />
      </Suspense>
    </>
  )
}
