import { after } from "next/server"
import { openAiModelFromEnv } from "@/lib/ai/openai-model"
import { answerInbound } from "@/lib/ai/reply"
import { notifierFromEnv } from "@/lib/push/server"
import { createAdminClient } from "@/lib/whatsapp/admin-client"
import { cloudApiFromEnv } from "@/lib/whatsapp/cloud-api"
import { createSupabaseStore } from "@/lib/whatsapp/supabase-store"
import { handleDelivery, handleVerification } from "@/lib/whatsapp/webhook"

// Callback URL for the Meta app: https://<host>/api/webhooks/whatsapp
// proxy.ts skips this path: Meta is not a signed-in user. The signature check
// in handleDelivery is what authenticates the caller.

// Time for the AI reply that runs after the 200 has been sent. The AI work gets
// a deadline well inside it, so a slow model ends in a logged error instead of
// the platform cutting the run off silently.
export const maxDuration = 60
const AI_BUDGET_MS = 50_000

export async function GET(request: Request) {
  const { status, body } = handleVerification(
    new URL(request.url).searchParams,
    process.env.WHATSAPP_VERIFY_TOKEN,
  )
  return new Response(body, { status })
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const admin = createAdminClient()
  const store = admin ? createSupabaseStore(admin) : null

  const { status, body, pending } = await handleDelivery({
    rawBody,
    signature: request.headers.get("x-hub-signature-256"),
    appSecret: process.env.WHATSAPP_APP_SECRET,
    store,
    now: new Date(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  })

  if (admin && store && pending.length > 0) {
    const deadline = Date.now() + AI_BUDGET_MS
    after(async () => {
      const notifier = notifierFromEnv(admin)
      const deps = { store, api: cloudApiFromEnv(), model: openAiModelFromEnv(), now: () => new Date(), notifier, deadline }
      for (const item of pending) {
        // The customer's answer comes first; the staff notification follows it.
        await answerInbound(item, deps)
        if (notifier && item.assignedTo) {
          const conversation = await store.getConversation(item.conversationId).catch(() => null)
          if (conversation) await notifier.assigned(conversation, item.assignedTo, null)
        }
      }
    })
  }

  return new Response(body, { status })
}
