import Link from "next/link"
import { formatPhone } from "@/lib/phone"
import type { ThreadData } from "@/lib/whatsapp/inbox"
import type { AutomationEvent } from "@/lib/whatsapp/types"
import { Chip } from "./chips"
import { QualificationPanel } from "./qualification-panel"
import { CandidateNotice, OpenEvents } from "./thread-notices"

function CustomerLink({ lead }: { lead: ThreadData["conversation"]["lead"] }) {
  if (!lead) return <p className="text-[13px] text-muted">No customer record linked yet</p>
  return (
    <Link
      href={`/customers/${lead.id}`}
      className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
    >
      Open customer
    </Link>
  )
}

// Secondary material sits behind one disclosure with a capped height, so it can
// never push the takeover button or the reply box off a phone screen.
export function ThreadDetails({ data, events }: { data: ThreadData; events: AutomationEvent[] }) {
  const { conversation, candidates } = data
  const needsReview = candidates.length > 0 || events.length > 0

  return (
    <details className="shrink-0 border-y border-line">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-[13px] font-medium text-ink focus-visible:-outline-offset-2 md:px-6">
        Customer details
        {needsReview ? <Chip tone="warning">Needs review</Chip> : null}
      </summary>
      <div className="flex max-h-[30dvh] flex-col gap-3 overflow-y-auto px-4 pb-3 md:max-h-[40dvh] md:px-6">
        <CandidateNotice conversationId={conversation.id} candidates={candidates} />
        <OpenEvents events={events} />
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <p className="text-sm tabular-nums text-ink">{formatPhone(conversation.wa_id)}</p>
          <CustomerLink lead={conversation.lead} />
        </div>
        <QualificationPanel qualification={data.qualification} />
      </div>
    </details>
  )
}
