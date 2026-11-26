import { answeredBy } from "@/components/dashboard/chats-card"
import { Chip } from "@/components/inbox/chips"
import { ATTENTION } from "@/components/inbox/conversation-list"
import { formatRelative } from "@/components/inbox/format"
import { Card, CardHeader, CardHeaderLink } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { buttonClass } from "@/components/ui/button"
import type { ChatMessage, CustomerChat } from "@/lib/data/customers"

type Ready = Extract<CustomerChat, { state: "ready" }>

// Who wrote a message, in the inbox's own words. A colleague whose name this
// viewer cannot read is "Staff", never a guessed name.
function sender(message: ChatMessage, chat: Ready, viewerId: string) {
  if (message.sender_type === "customer") return "Customer"
  if (message.sender_type === "bot") return "AI"
  if (message.sender_sales_id === viewerId) return "You"
  return (message.sender_sales_id && chat.senders.get(message.sender_sales_id)) || "Staff"
}

const bubble = {
  in: "self-start bg-surface-raised border border-line",
  out: "self-end bg-surface-sunken",
} as const

function MessageBody({ message }: { message: ChatMessage }) {
  if (message.body?.trim()) return <p className="line-clamp-3 whitespace-pre-wrap break-words text-[13px]">{message.body.trim()}</p>
  return <p className="text-[13px] text-muted">No text ({message.message_type})</p>
}

/** "WhatsApp": the latest messages of this customer's conversation and who is answering it. */
export function ChatCard({ chat, viewerId, retryHref }: { chat: CustomerChat; viewerId: string; retryHref: string }) {
  const action = chat.state === "ready" ? <CardHeaderLink href={`/inbox/${chat.conversation.id}`}>Open in Inbox</CardHeaderLink> : undefined
  return (
    <Card className="max-md:p-4">
      <CardHeader title="WhatsApp" meta="Latest messages with this customer" action={action} />
      <ChatBody chat={chat} viewerId={viewerId} retryHref={retryHref} />
    </Card>
  )
}

function ChatBody({ chat, viewerId, retryHref }: { chat: CustomerChat; viewerId: string; retryHref: string }) {
  if (chat.state === "not_set_up") {
    return (
      <EmptyState
        title="WhatsApp is not set up yet"
        detail="The chat tables have not been added to this database. Once the project owner adds them, this customer's chat shows here."
      />
    )
  }
  if (chat.state === "error") {
    return (
      <ErrorState
        title="The chat could not be loaded"
        detail={`The server answered: ${chat.message}. Nothing was changed.`}
        action={
          <a href={retryHref} className={buttonClass("secondary")}>
            Try again
          </a>
        }
      />
    )
  }
  if (chat.state === "none") {
    return (
      <EmptyState
        title="No WhatsApp chat with this customer yet."
        detail="When they write to the FSI WhatsApp number from the phone saved here, the chat is linked and shows in this card. To start one, use the WhatsApp button."
      />
    )
  }

  const staff = answeredBy(chat.conversation, viewerId, chat.senders)
  const now = new Date()
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        {chat.attention ? <Chip>{ATTENTION[chat.attention]}</Chip> : null}
        <span>{staff ? `Answered by ${staff}` : "Nobody has taken over yet"}</span>
      </p>
      {chat.messages.length === 0 ? (
        <p className="text-[13px] text-muted">The conversation has no messages yet.</p>
      ) : (
        <ol aria-label="Latest messages" className="flex flex-col gap-2">
          {chat.messages.map((message) => (
            <li
              key={message.id}
              className={`flex max-w-[85%] flex-col gap-1 rounded-[12px] px-3 py-2 ${bubble[message.sender_type === "customer" ? "in" : "out"]}`}
            >
              <span className="flex items-baseline gap-2 text-xs text-muted">
                <span className="font-medium text-ink">{sender(message, chat, viewerId)}</span>
                <time dateTime={message.created_at} className="tabular-nums">
                  {formatRelative(message.created_at, now)}
                </time>
              </span>
              <MessageBody message={message} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
