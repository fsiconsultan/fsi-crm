import "server-only"
import OpenAI from "openai"
import type { ChatMessage, ChatModel } from "./model"

const MODEL_TIMEOUT_MS = 15_000

function toOpenAi(message: ChatMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  switch (message.role) {
    case "system":
    case "user":
      return { role: message.role, content: message.content }
    case "tool":
      return { role: "tool", tool_call_id: message.toolCallId, content: message.content }
    case "assistant":
      return {
        role: "assistant",
        content: message.content,
        ...(message.toolCalls?.length
          ? {
              tool_calls: message.toolCalls.map((call) => ({
                id: call.id,
                type: "function" as const,
                function: { name: call.name, arguments: call.arguments },
              })),
            }
          : {}),
      }
  }
}

// Returns null until both OPENAI_API_KEY and OPENAI_MODEL are set. The caller
// logs that; it never falls back to a canned reply.
export function openAiModelFromEnv(): ChatModel | null {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL
  if (!apiKey || !model) return null

  // The SDK default is a 10-minute timeout with 2 retries, far past what one
  // serverless run may take. Each call also gets what is left of the run.
  const client = new OpenAI({ apiKey, timeout: MODEL_TIMEOUT_MS, maxRetries: 1 })

  return {
    async complete({ messages, tools, timeoutMs }) {
      const completion = await client.chat.completions.create(
        {
          model,
          messages: messages.map(toOpenAi),
          tools: tools.map((tool) => ({
            type: "function" as const,
            function: { name: tool.name, description: tool.description, parameters: tool.parameters },
          })),
        },
        { timeout: Math.min(MODEL_TIMEOUT_MS, timeoutMs ?? MODEL_TIMEOUT_MS) },
      )

      const reply = completion.choices[0]?.message
      return {
        content: reply?.content ?? null,
        toolCalls: (reply?.tool_calls ?? []).flatMap((call) =>
          call.type === "function"
            ? [{ id: call.id, name: call.function.name, arguments: call.function.arguments }]
            : [],
        ),
      }
    },
  }
}
