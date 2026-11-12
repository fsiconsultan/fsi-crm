import type { ChatMessage, ChatModel, ChatReply, ToolSpec } from "./model"

type Step = Partial<ChatReply> | ((messages: ChatMessage[]) => Partial<ChatReply> | Promise<Partial<ChatReply>>)

// A scripted ChatModel for tests: each call returns the next step and records
// what the agent sent, so tests can assert on the prompt and tool results.
export function fakeModel(steps: Step[]) {
  const calls: Array<{ messages: ChatMessage[]; tools: ToolSpec[] }> = []
  let index = 0

  const model: ChatModel = {
    async complete(input) {
      calls.push({ messages: [...input.messages], tools: input.tools })
      const step = steps[index++]
      if (!step) throw new Error("fakeModel ran out of scripted steps")
      const reply = typeof step === "function" ? await step(input.messages) : step
      return { content: reply.content ?? null, toolCalls: reply.toolCalls ?? [] }
    },
  }

  return { model, calls }
}

let callId = 0
export function call(name: string, args: Record<string, unknown> = {}) {
  return { id: `call-${++callId}`, name, arguments: JSON.stringify(args) }
}
