import Link from "next/link"
import { EmptyState } from "@/components/ui/states"
import { formatPhone } from "@/lib/phone"
import type { ReviewEvent } from "@/lib/whatsapp/inbox"
import { ActionForm } from "./action-form"
import { Chip } from "./chips"
import { formatDateTime } from "./format"

const TYPE_LABELS: Record<string, string> = {
  lead_match_ambiguous: "Duplicate phone match",
  status_change_refused: "Status change refused",
  status_change_failed: "Status change failed",
  send_failed: "Message not sent",
  handoff_requested: "Handoff requested",
  ai_not_configured: "AI not configured",
  ai_error: "AI error",
  tool_failed: "AI step failed",
  webhook_error: "Webhook error",
}

function SeverityChip({ severity }: { severity: string }) {
  if (severity === "error") return <Chip tone="negative">Failed</Chip>
  if (severity === "warning") return <Chip tone="warning">Check</Chip>
  return null
}

function Customer({ conversation }: { conversation: ReviewEvent["conversation"] }) {
  if (!conversation) return null
  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4"
    >
      {conversation.profile_name ?? formatPhone(conversation.wa_id)}
    </Link>
  )
}

function ReviewRow({ event }: { event: ReviewEvent }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityChip severity={event.severity} />
          <span className="text-[13px] font-medium text-ink">{TYPE_LABELS[event.type] ?? event.type}</span>
        </div>
        <p className="mt-1 break-words text-sm text-ink">{event.summary}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <time dateTime={event.created_at} className="tabular-nums">
            {formatDateTime(event.created_at)}
          </time>
          <Customer conversation={event.conversation} />
        </p>
      </div>
      <ActionForm kind="resolveEvent" fields={{ eventId: event.id }} />
    </li>
  )
}

export function ReviewList({ events }: { events: ReviewEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Nothing needs review"
        detail="Failed sends, refused status changes and duplicate phone matches appear here when they happen."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {events.map((event) => (
        <ReviewRow key={event.id} event={event} />
      ))}
    </ul>
  )
}
