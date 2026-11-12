import { HatchBar } from "@/components/ui/hatch-bar"
import type { ThreadData } from "@/lib/whatsapp/inbox"
import { ActionForm } from "./action-form"
import { replyWindow } from "./format"
import { ReplyBox } from "./reply-box"
import { ReplyField } from "./reply-field"

export type Template = { name: string } | null

// The hatch motif's one use on this screen: hours of the 24-hour reply window already spent.
function WindowMeter({ lastInboundAt, now }: { lastInboundAt: string | null; now: Date }) {
  if (!lastInboundAt) {
    return <p className="text-xs text-muted">Reply window not open: the customer has not written yet.</p>
  }
  const { usedHours, label } = replyWindow(lastInboundAt, now)
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs tabular-nums text-muted">{label}</p>
      <HatchBar value={usedHours} max={24} label={label} />
    </div>
  )
}

function DisabledReply({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex">
        <span className="sr-only">Reply to the customer</span>
        <ReplyField disabled />
      </label>
      <p className="text-sm text-muted">{reason}</p>
    </div>
  )
}

function TemplateSend({ conversationId, template }: { conversationId: string; template: Template }) {
  if (!template) return <p className="text-sm text-muted">No approved template is configured yet.</p>
  return (
    <ActionForm
      kind="sendReengageTemplate"
      fields={{ conversationId }}
      label={`Send template: ${template.name}`}
      variant="primary"
    />
  )
}

function ReplyControl({ data, template }: { data: ThreadData; template: Template }) {
  const { conversation, windowOpen } = data

  if (conversation.mode !== "human") {
    return <DisabledReply reason="Take over the conversation to reply. The AI is answering for now." />
  }
  if (!windowOpen) {
    return (
      <>
        <DisabledReply reason="The customer last wrote more than 24 hours ago. WhatsApp only allows an approved template message now." />
        <TemplateSend conversationId={conversation.id} template={template} />
      </>
    )
  }
  return <ReplyBox conversationId={conversation.id} />
}

export function ReplyArea({ data, template, now }: { data: ThreadData; template: Template; now: Date }) {
  return (
    <footer className="flex shrink-0 flex-col gap-3 border-t border-line px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-6">
      <WindowMeter lastInboundAt={data.conversation.last_inbound_at} now={now} />
      <ReplyControl data={data} template={template} />
    </footer>
  )
}
