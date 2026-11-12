import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { Assignee, ThreadData } from "@/lib/whatsapp/inbox"
import { AssignDialog } from "./assign-dialog"
import { ModeChip } from "./chips"
import { assigneeLabel, displayName, formatDateTime, modeKind } from "./format"
import { TakeoverControl } from "./takeover-control"

export type Viewer = { id: string; name: string }

function staffName(data: ThreadData, viewer: Viewer) {
  const by = data.conversation.taken_over_by
  if (data.conversation.mode !== "human" || !by) return null
  return by === viewer.id ? viewer.name : (data.senders[by] ?? "FSI staff")
}

function idleNote(data: ThreadData) {
  const { mode, taken_over_by: by, taken_over_at: at } = data.conversation
  if (mode !== "human") return "The AI is answering. Take over to reply yourself."
  if (!by) return "The AI asked for a person to take over."
  return at ? `Taken over on ${formatDateTime(at)}. The AI is paused.` : "The AI is paused."
}

// Everything a salesperson needs before replying, and nothing that scrolls: who the
// customer is, who is answering, who owns it, and the one button that changes that.
export function ThreadHeader({
  data,
  viewer,
  admin,
  assignees,
}: {
  data: ThreadData
  viewer: Viewer
  admin: boolean
  assignees: Assignee[]
}) {
  const { conversation } = data
  const staff = staffName(data, viewer)
  const assigned = assigneeLabel(conversation)

  return (
    <header className="shrink-0 px-4 pb-3 pt-1 md:px-6 md:pt-4">
      <Link
        href="/inbox"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] px-2 text-sm text-ink transition-colors duration-[120ms] hover:bg-surface-sunken lg:hidden"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to conversations
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate text-[17px] font-medium leading-6 text-ink">{displayName(conversation)}</h2>
        <ModeChip kind={modeKind(conversation)} />
      </div>
      <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-ink">
        {staff ? <span className="min-w-0 break-words">Staff: {staff}</span> : null}
        <span className="min-w-0 break-words">{conversation.assigned_sales_id ? `Assigned: ${assigned}` : assigned}</span>
      </p>

      <div className="mt-2">
        <TakeoverControl
          conversationId={conversation.id}
          human={conversation.mode === "human"}
          takenOverByViewer={conversation.taken_over_by === viewer.id}
          idleNote={idleNote(data)}
        >
          {admin ? (
            <AssignDialog
              conversationId={conversation.id}
              assignedSalesId={conversation.assigned_sales_id}
              assignees={assignees}
            />
          ) : null}
        </TakeoverControl>
      </div>
    </header>
  )
}
