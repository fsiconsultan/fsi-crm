import { safeLog, type WaStore } from "@/lib/whatsapp/store"
import type { Conversation, Message } from "@/lib/whatsapp/types"
import type { Notifier } from "@/lib/push/notify"
import type { ChatMessage, ChatModel } from "./model"
import { buildSystemPrompt } from "./prompt"
import { cleanAnswers } from "./qualification"
import { TOOLS, type ToolContext } from "./tools"

const HISTORY_LIMIT = 30
const MAX_ROUNDS = 6

export type AgentResult = { reply: string | null; handoffRequested: boolean }

function toChat(message: Message): ChatMessage | null {
  if (message.direction === "inbound") {
    return {
      role: "user",
      content: message.body ?? `[The customer sent a ${message.message_type} message that you cannot open.]`,
    }
  }
  // A failed send never reached the customer, so it is not part of the conversation.
  if (message.status === "failed" || !message.body) return null
  return {
    role: "assistant",
    content: message.sender_type === "human" ? `[Sent by FSI staff] ${message.body}` : message.body,
  }
}

// One turn of the assistant: read the thread, call tools, return the text to
// send. It does not send anything itself; reply.ts does that.
export async function runAgent(input: {
  store: WaStore
  model: ChatModel
  conversation: Conversation
  now: Date
  notifier?: Notifier | null
}): Promise<AgentResult> {
  const { store, model, now } = input
  const ctx: ToolContext = {
    store,
    conversation: input.conversation,
    now,
    handoffRequested: false,
    notifier: input.notifier,
  }

  const [history, qualification] = await Promise.all([
    store.listMessages(ctx.conversation.id, HISTORY_LIMIT),
    store.getQualification(ctx.conversation.id),
  ])

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        profileName: ctx.conversation.profile_name,
        leadLinked: ctx.conversation.lead_id !== null,
        answers: cleanAnswers(qualification?.answers),
        today: now.toISOString().slice(0, 10),
      }),
    },
    ...history.map(toChat).filter((m): m is ChatMessage => m !== null),
  ]

  const specs = TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters }))

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await model.complete({ messages, tools: specs })

    if (reply.toolCalls.length === 0) {
      return { reply: reply.content?.trim() || null, handoffRequested: ctx.handoffRequested }
    }

    messages.push({ role: "assistant", content: reply.content, toolCalls: reply.toolCalls })

    for (const call of reply.toolCalls) {
      let result: unknown
      try {
        const tool = TOOLS.find((t) => t.name === call.name)
        if (!tool) throw new Error(`Unknown tool ${call.name}`)
        const args = call.arguments ? JSON.parse(call.arguments) : {}
        result = await tool.run(ctx, args && typeof args === "object" ? args : {})
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error"
        await safeLog(store, {
          type: "tool_failed",
          conversationId: ctx.conversation.id,
          leadId: ctx.conversation.lead_id,
          severity: "error",
          needsReview: true,
          summary: `The assistant's ${call.name} step failed: ${reason}`,
          detail: { tool: call.name, arguments: call.arguments },
        })
        result = { status: "error", message: "This step failed and nothing was saved." }
      }
      messages.push({ role: "tool", toolCallId: call.id, content: JSON.stringify(result) })
    }
  }

  throw new Error(`The assistant did not finish within ${MAX_ROUNDS} tool rounds.`)
}
