import Link from "next/link"
import { EmptyState } from "@/components/ui/states"
import { cn } from "@/lib/cn"
import type { ConversationSummary } from "@/lib/whatsapp/inbox"
import { Chip, ModeChip } from "./chips"
import { assigneeLabel, displayName, formatShortTime, modeKind } from "./format"

const rowTone: Record<"selected" | "idle", string> = {
  selected: "bg-surface-sunken",
  idle: "",
}

const nameWeight: Record<"unread" | "read", string> = {
  unread: "font-semibold",
  read: "font-medium",
}

const ATTENTION: Record<NonNullable<ConversationSummary["attention"]>, string> = {
  handoff: "Waiting for staff",
  reply: "Waiting for your reply",
}

// A row that needs a person says so; the rest show who is answering.
function StateChip({ conversation }: { conversation: ConversationSummary }) {
  if (conversation.attention) return <Chip tone="warning">{ATTENTION[conversation.attention]}</Chip>
  return <ModeChip kind={modeKind(conversation)} />
}

function ConversationRow({
  conversation,
  selected,
  now,
}: {
  conversation: ConversationSummary
  selected: boolean
  now: Date
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        href={`/inbox/${conversation.id}`}
        aria-current={selected ? "page" : undefined}
        // Inset focus ring: the pane clips anything drawn outside the row.
        className={cn(
          "flex min-h-14 flex-col gap-1 px-4 py-3 transition-colors duration-[120ms] hover:bg-surface-sunken focus-visible:-outline-offset-2",
          rowTone[selected ? "selected" : "idle"],
        )}
      >
        <span className="flex items-center gap-2">
          {conversation.unread ? (
            <span className="size-2 shrink-0 rounded-full bg-accent">
              <span className="sr-only">Unread</span>
            </span>
          ) : null}
          <span
            className={cn("min-w-0 flex-1 truncate text-sm text-ink", nameWeight[conversation.unread ? "unread" : "read"])}
          >
            {displayName(conversation)}
          </span>
          {conversation.last_message_at ? (
            <time dateTime={conversation.last_message_at} className="shrink-0 text-xs tabular-nums text-muted">
              {formatShortTime(conversation.last_message_at, now)}
            </time>
          ) : null}
        </span>
        {conversation.last_message_preview ? (
          <span className="truncate text-[13px] text-muted">{conversation.last_message_preview}</span>
        ) : null}
        <span className="flex items-center gap-2">
          <StateChip conversation={conversation} />
          <span className="min-w-0 truncate text-xs text-muted">{assigneeLabel(conversation)}</span>
        </span>
      </Link>
    </li>
  )
}

export function ConversationList({
  conversations,
  selectedId,
  now,
}: {
  conversations: ConversationSummary[]
  selectedId: string | null
  now: Date
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No conversations yet"
          detail="When a customer writes to FSI's WhatsApp number, the conversation appears here."
        />
      </div>
    )
  }

  return (
    <nav aria-label="Conversations" className="min-h-0 flex-1 lg:overflow-y-auto">
      <ul>
        {conversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            selected={conversation.id === selectedId}
            now={now}
          />
        ))}
      </ul>
    </nav>
  )
}
