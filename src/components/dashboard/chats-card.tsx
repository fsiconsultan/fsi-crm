import Link from "next/link"
import { Chip } from "@/components/inbox/chips"
import { ATTENTION } from "@/components/inbox/conversation-list"
import { displayName, formatRelative } from "@/components/inbox/format"
import { buttonClass } from "@/components/ui/button"
import { Card, CardHeader, CardHeaderLink } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { loadInbox, type ConversationSummary } from "@/lib/whatsapp/inbox"

const CHATS_SHOWN = 5

/**
 * Who is answering a chat: the AI, or the staff member who took it over. Null
 * while a handoff waits for someone. A colleague whose name this viewer cannot
 * read is "Staff", never a guessed name.
 */
export function answeredBy(
  conversation: Pick<ConversationSummary, "mode" | "taken_over_by" | "assignee">,
  viewerId: string,
  names: Map<string, string> | null,
) {
  if (conversation.mode !== "human") return "AI"
  const staffId = conversation.taken_over_by
  if (!staffId) return null
  if (staffId === viewerId) return "You"
  if (conversation.assignee?.id === staffId && conversation.assignee.name) return conversation.assignee.name
  return names?.get(staffId) ?? "Staff"
}

/**
 * The newest WhatsApp conversations this person may see (RLS), the ones that
 * need a person first, through the inbox's own loader.
 */
export async function ChatsCard({
  viewerId,
  names,
  retryHref,
}: {
  viewerId: string
  /** Salesperson names by id for Admin; null for everyone else. */
  names: Map<string, string> | null
  retryHref: string
}) {
  const inbox = await loadInbox(viewerId)

  return (
    <Card className="flex h-full flex-col max-md:p-4">
      <CardHeader
        title="Active chats"
        meta="Latest WhatsApp conversations"
        action={<CardHeaderLink href="/inbox">Inbox</CardHeaderLink>}
      />
      <ChatsBody inbox={inbox} viewerId={viewerId} names={names} retryHref={retryHref} />
    </Card>
  )
}

function ChatsBody({
  inbox,
  viewerId,
  names,
  retryHref,
}: {
  inbox: Awaited<ReturnType<typeof loadInbox>>
  viewerId: string
  names: Map<string, string> | null
  retryHref: string
}) {
  if (inbox.state === "not_set_up") {
    return (
      <EmptyState
        title="WhatsApp is not set up yet"
        detail="The chat tables have not been added to this database. Once the project owner adds them, chats appear here."
      />
    )
  }
  if (inbox.state === "error") {
    return (
      <ErrorState
        title="The chats could not be loaded"
        detail={`${inbox.message}. Check your connection and try again.`}
        action={
          <a href={retryHref} className={buttonClass("secondary")}>
            Try again
          </a>
        }
      />
    )
  }

  const conversations = inbox.data.conversations.slice(0, CHATS_SHOWN)
  if (conversations.length === 0) {
    return (
      <EmptyState title="No WhatsApp chats yet" detail="They appear here once the number is connected." />
    )
  }

  const now = new Date()
  return (
    <ul className="-mt-1 divide-y divide-line">
      {conversations.map((conversation) => (
        <ChatRow key={conversation.id} conversation={conversation} viewerId={viewerId} names={names} now={now} />
      ))}
    </ul>
  )
}

const rowTone: Record<"waiting" | "calm", string> = {
  waiting: "bg-warning-soft",
  calm: "hover:bg-surface-sunken",
}

function ChatRow({
  conversation,
  viewerId,
  names,
  now,
}: {
  conversation: ConversationSummary
  viewerId: string
  names: Map<string, string> | null
  now: Date
}) {
  const staff = answeredBy(conversation, viewerId, names)

  return (
    <li>
      <Link
        href={`/inbox/${conversation.id}`}
        className={`-mx-2 my-1 flex min-h-14 flex-col gap-1 rounded-[var(--radius-control)] px-2 py-2 transition-colors duration-[120ms] focus-visible:-outline-offset-2 ${rowTone[conversation.attention ? "waiting" : "calm"]}`}
      >
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayName(conversation)}</span>
          {conversation.last_message_at ? (
            <time dateTime={conversation.last_message_at} className="shrink-0 text-xs tabular-nums text-muted">
              {formatRelative(conversation.last_message_at, now)}
            </time>
          ) : null}
        </span>
        {conversation.last_message_preview ? (
          <span className="truncate text-xs text-muted">{conversation.last_message_preview}</span>
        ) : null}
        <span className="flex items-center gap-2">
          {conversation.attention ? <Chip>{ATTENTION[conversation.attention]}</Chip> : null}
          <span className="min-w-0 truncate text-xs text-muted">
            {staff ? `Answered by ${staff}` : "Nobody has taken over yet"}
          </span>
        </span>
      </Link>
    </li>
  )
}
