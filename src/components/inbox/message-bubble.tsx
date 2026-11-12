import { cn } from "@/lib/cn"
import type { Message } from "@/lib/whatsapp/types"
import { formatDateTime } from "./format"

type Kind = "inbound" | "outbound" | "failed"

const align: Record<Kind, string> = {
  inbound: "justify-start",
  outbound: "justify-end",
  failed: "justify-end",
}

// A failed send must never read as sent: it gets its own tint, not the outbound style.
const bubble: Record<Kind, string> = {
  inbound: "bg-surface-sunken",
  outbound: "border border-line bg-surface",
  failed: "bg-negative-soft",
}

// Muted text only passes AA on the neutral surfaces, so the tinted bubble uses ink.
const meta: Record<Kind, string> = {
  inbound: "text-muted",
  outbound: "text-muted",
  failed: "text-ink",
}

const DELIVERY: Record<string, string> = { sent: "Sent", delivered: "Delivered", read: "Read" }

function kindOf(message: Message): Kind {
  if (message.sender_type === "customer") return "inbound"
  return message.status === "failed" ? "failed" : "outbound"
}

function senderLabel(message: Message, senders: Record<string, string>) {
  if (message.sender_type === "bot") return "AI assistant"
  return (message.sender_sales_id && senders[message.sender_sales_id]) || "FSI staff"
}

function MessageBody({ message }: { message: Message }) {
  if (message.body === null) {
    return (
      <p className="text-sm italic text-muted">[{message.message_type} message, open WhatsApp to view it]</p>
    )
  }
  return <p className="whitespace-pre-wrap text-sm text-ink [overflow-wrap:anywhere]">{message.body}</p>
}

function FailureDetail({ message }: { message: Message }) {
  return (
    <div className="mt-1">
      <p className="text-sm font-medium text-negative">Not sent</p>
      {message.error_message ? <p className="text-[13px] text-ink [overflow-wrap:anywhere]">{message.error_message}</p> : null}
    </div>
  )
}

export function MessageBubble({ message, senders }: { message: Message; senders: Record<string, string> }) {
  const kind = kindOf(message)
  const delivery = kind === "outbound" ? DELIVERY[message.status] : undefined

  return (
    <li className={cn("flex", align[kind])}>
      <div className={cn("min-w-0 max-w-[85%] rounded-[var(--radius-control)] px-3 py-2 md:max-w-[70%]", bubble[kind])}>
        {kind === "inbound" ? null : (
          <p className="text-xs font-medium text-ink">{senderLabel(message, senders)}</p>
        )}
        <MessageBody message={message} />
        {kind === "failed" ? <FailureDetail message={message} /> : null}
        <p className={cn("mt-1 text-xs tabular-nums", meta[kind])}>
          <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
          {delivery ? `, ${delivery}` : null}
        </p>
      </div>
    </li>
  )
}
