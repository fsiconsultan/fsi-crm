import type { Assignee, ThreadData } from "@/lib/whatsapp/inbox"
import { MarkRead } from "./mark-read"
import { MessageBubble } from "./message-bubble"
import { MessageLog } from "./message-log"
import { ReplyArea, type Template } from "./reply-area"
import { ThreadDetails } from "./thread-details"
import { ThreadHeader, type Viewer } from "./thread-header"

function Messages({ data, now }: { data: ThreadData; now: Date }) {
  if (data.messages.length === 0) return <p className="text-sm text-muted">No messages yet.</p>
  return (
    <ol className="flex flex-col gap-2">
      {data.messages.map((message) => (
        <MessageBubble key={message.id} message={message} senders={data.senders} now={now} />
      ))}
    </ol>
  )
}

// A fixed column inside the pane: header, details disclosure, scrolling log, reply box.
export function Thread({
  data,
  viewer,
  admin,
  assignees,
  template,
  now,
}: {
  data: ThreadData
  viewer: Viewer
  admin: boolean
  assignees: Assignee[]
  template: Template
  now: Date
}) {
  const { conversation, candidates, messages } = data
  // The candidate notice already covers the ambiguous match; do not list it twice.
  const events = candidates.length
    ? data.openEvents.filter((event) => event.type !== "lead_match_ambiguous")
    : data.openEvents
  const last = messages.at(-1)

  return (
    <>
      {conversation.unread ? (
        <MarkRead conversationId={conversation.id} lastInboundAt={conversation.last_inbound_at} />
      ) : null}
      <ThreadHeader data={data} viewer={viewer} admin={admin} assignees={assignees} />
      <ThreadDetails data={data} events={events} />
      <MessageLog scrollKey={`${messages.length}:${last?.id ?? ""}`}>
        <Messages data={data} now={now} />
      </MessageLog>
      <ReplyArea data={data} template={template} now={now} />
    </>
  )
}
