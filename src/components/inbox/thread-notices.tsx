import type { LeadCandidate } from "@/lib/whatsapp/inbox"
import type { AutomationEvent } from "@/lib/whatsapp/types"
import { ActionForm } from "./action-form"
import { formatDateTime } from "./format"

export function CandidateNotice({ conversationId, candidates }: { conversationId: string; candidates: LeadCandidate[] }) {
  if (candidates.length === 0) return null

  return (
    <section aria-label="Duplicate phone match" className="rounded-[var(--radius-control)] bg-warning-soft p-4">
      <p className="text-sm font-medium text-warning">
        Several customer records share this number. Choose the right one.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 break-words text-sm text-ink">
              <span className="font-medium">{candidate.customer_name ?? "Unnamed"}</span>
              {candidate.phone ? <span className="tabular-nums">, {candidate.phone}</span> : null}
              <span className="tabular-nums">, #{candidate.id}</span>
            </p>
            <ActionForm kind="linkLead" fields={{ conversationId, leadId: String(candidate.id) }} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OpenEvents({ events }: { events: AutomationEvent[] }) {
  if (events.length === 0) return null

  return (
    <section aria-label="Needs review">
      <h3 className="text-[13px] font-medium text-ink">Needs review</h3>
      <ul className="mt-2 flex flex-col divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
            <div className="min-w-0">
              <p className="text-sm text-ink [overflow-wrap:anywhere]">{event.summary}</p>
              <time dateTime={event.created_at} className="text-xs tabular-nums text-muted">
                {formatDateTime(event.created_at)}
              </time>
            </div>
            <ActionForm kind="resolveEvent" fields={{ eventId: event.id }} />
          </li>
        ))}
      </ul>
    </section>
  )
}
