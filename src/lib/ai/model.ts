// The agent talks to the language model through this interface only, so tests
// run against a scripted fake and the provider can change without touching the
// agent. The OpenAI implementation is in openai-model.ts.

export type ToolCall = { id: string; name: string; arguments: string }

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string }

export type ToolSpec = {
  name: string
  description: string
  // JSON Schema for the arguments object.
  parameters: Record<string, unknown>
}

export type ChatReply = { content: string | null; toolCalls: ToolCall[] }

export interface ChatModel {
  // timeoutMs: the most this one call may take; the agent passes what is left of its run.
  complete(input: { messages: ChatMessage[]; tools: ToolSpec[]; timeoutMs?: number }): Promise<ChatReply>
}
