"use server"

import { revalidatePath } from "next/cache"
import { getProfile, isAdmin } from "@/lib/auth"
import { cloudApiFromEnv } from "@/lib/whatsapp/cloud-api"
import { inboxClient, reengageTemplate } from "@/lib/whatsapp/inbox"
import { sendAndRecord, type OutboundContent } from "@/lib/whatsapp/outbound"
import { createSupabaseStore } from "@/lib/whatsapp/supabase-store"

export type ActionState = { error: string | null; ok?: boolean }

const NOT_ALLOWED = "This conversation could not be changed. It may have been reassigned; reload the inbox."
const MAX_REPLY_LENGTH = 4096

function fail(error: string): ActionState {
  return { error }
}

function done(): ActionState {
  revalidatePath("/inbox", "layout")
  return { error: null, ok: true }
}

// Staff take the conversation: the AI stops replying until it is handed back.
export async function takeOver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversationId = String(formData.get("conversationId") ?? "")
  const profile = await getProfile()
  const db = await inboxClient()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from("wa_conversations")
    .update({ mode: "human", taken_over_by: profile.id, taken_over_at: now })
    .eq("id", conversationId)
    .select("id, lead_id")
  if (error) return fail(`Could not take over: ${error.message}`)
  if (!data?.length) return fail(NOT_ALLOWED)

  const log = await db.from("automation_events").insert({
    type: "takeover",
    conversation_id: conversationId,
    lead_id: data[0].lead_id,
    summary: `${profile.name} took over the conversation. AI replies are paused.`,
    actor_sales_id: profile.id,
  })
  if (log.error) return fail(`You have taken over, but the takeover could not be logged: ${log.error.message}`)

  return done()
}

export async function handBack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversationId = String(formData.get("conversationId") ?? "")
  const profile = await getProfile()
  const db = await inboxClient()

  const { data, error } = await db
    .from("wa_conversations")
    .update({ mode: "bot", handed_back_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select("id, lead_id")
  if (error) return fail(`Could not hand back: ${error.message}`)
  if (!data?.length) return fail(NOT_ALLOWED)

  const log = await db.from("automation_events").insert({
    type: "handback",
    conversation_id: conversationId,
    lead_id: data[0].lead_id,
    summary: `${profile.name} handed the conversation back to the AI.`,
    actor_sales_id: profile.id,
  })
  if (log.error) return fail(`Handed back, but the hand-back could not be logged: ${log.error.message}`)

  return done()
}

export async function assignConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversationId = String(formData.get("conversationId") ?? "")
  const salesId = String(formData.get("salesId") ?? "") || null
  const profile = await getProfile()
  if (!isAdmin(profile)) return fail("Only an Admin can assign conversations.")
  const db = await inboxClient()

  const current = await db
    .from("wa_conversations")
    .select("id, lead_id, assigned_sales_id")
    .eq("id", conversationId)
    .maybeSingle()
  if (current.error || !current.data) return fail(current.error?.message ?? NOT_ALLOWED)
  if (current.data.assigned_sales_id === salesId) return done()

  const { error } = await db.from("wa_conversations").update({ assigned_sales_id: salesId }).eq("id", conversationId)
  if (error) return fail(`Could not assign: ${error.message}`)

  const problems: string[] = []

  // A lead the AI created has no owner yet. Give it this one so the salesperson
  // can open it. A lead that already has an owner is left alone.
  if (salesId && current.data.lead_id) {
    const lead = await db.from("leads").update({ sales_id: salesId }).eq("id", current.data.lead_id).is("sales_id", null)
    if (lead.error) problems.push(`the lead owner was not set (${lead.error.message})`)
  }

  const history = await db.from("assignment_history").insert({
    conversation_id: conversationId,
    lead_id: current.data.lead_id,
    from_sales_id: current.data.assigned_sales_id,
    to_sales_id: salesId,
    rule: "manual",
    assigned_by: profile.id,
  })
  if (history.error) problems.push(`the assignment history was not written (${history.error.message})`)

  revalidatePath("/inbox", "layout")
  return problems.length ? fail(`Assigned, but ${problems.join(" and ")}.`) : { error: null, ok: true }
}

async function send(conversationId: string, content: OutboundContent): Promise<ActionState> {
  const profile = await getProfile()
  const store = createSupabaseStore(await inboxClient())

  let conversation
  try {
    conversation = await store.getConversation(conversationId)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not load the conversation.")
  }
  if (!conversation) return fail(NOT_ALLOWED)
  // Replies need a named person on the conversation: it keeps the AI quiet and
  // records who is answering.
  if (conversation.mode !== "human" || !conversation.taken_over_by) {
    return fail("Take over the conversation before replying.")
  }

  try {
    const { result } = await sendAndRecord({
      store,
      api: cloudApiFromEnv(),
      conversation,
      content,
      sender: { type: "human", salesId: profile.id },
      now: new Date(),
    })
    revalidatePath("/inbox", "layout")
    return result.ok ? { error: null, ok: true } : fail(result.message)
  } catch (error) {
    // The send may have gone out; what failed is writing it down.
    revalidatePath("/inbox", "layout")
    return fail(
      `The message could not be recorded (${error instanceof Error ? error.message : "unknown error"}). Check WhatsApp before sending it again.`,
    )
  }
}

export async function sendReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const body = String(formData.get("body") ?? "").trim()
  if (!body) return fail("Write a message first.")
  if (body.length > MAX_REPLY_LENGTH) return fail(`WhatsApp messages are limited to ${MAX_REPLY_LENGTH} characters.`)
  return send(String(formData.get("conversationId") ?? ""), { type: "text", body })
}

export async function sendReengageTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const template = reengageTemplate()
  if (!template) return fail("No approved template is configured yet.")
  return send(String(formData.get("conversationId") ?? ""), {
    type: "template",
    name: template.name,
    languageCode: template.languageCode,
    body: `[Template: ${template.name}]`,
  })
}

// Resolves an ambiguous phone match: a person picks the lead.
export async function linkLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversationId = String(formData.get("conversationId") ?? "")
  const leadId = Number(formData.get("leadId"))
  if (!Number.isInteger(leadId)) return fail("Choose a lead to link.")
  const profile = await getProfile()
  const db = await inboxClient()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from("wa_conversations")
    .update({ lead_id: leadId })
    .eq("id", conversationId)
    .select("id")
  if (error) return fail(`Could not link the lead: ${error.message}`)
  if (!data?.length) return fail(NOT_ALLOWED)

  const [log, resolved] = await Promise.all([
    db.from("automation_events").insert({
      type: "lead_linked",
      conversation_id: conversationId,
      lead_id: leadId,
      summary: `${profile.name} linked the conversation to lead #${leadId}.`,
      actor_sales_id: profile.id,
    }),
    db
      .from("automation_events")
      .update({ resolved_at: now, resolved_by: profile.id })
      .eq("conversation_id", conversationId)
      .eq("type", "lead_match_ambiguous")
      .is("resolved_at", null),
  ])
  const problem = log.error ?? resolved.error
  if (problem) return fail(`Linked, but the log could not be updated: ${problem.message}`)

  return done()
}

export async function resolveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const eventId = String(formData.get("eventId") ?? "")
  const profile = await getProfile()
  const db = await inboxClient()

  const { data, error } = await db
    .from("automation_events")
    .update({ resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", eventId)
    .is("resolved_at", null)
    .select("id")
  if (error) return fail(`Could not mark it reviewed: ${error.message}`)
  if (!data?.length) return fail("This item was already reviewed or is no longer visible to you.")

  return done()
}

// Called when a thread is opened. A failure only leaves the unread mark in place.
export async function markRead(conversationId: string) {
  await getProfile()
  const db = await inboxClient()
  const { error } = await db
    .from("wa_conversations")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", conversationId)
  if (!error) revalidatePath("/inbox", "layout")
}
