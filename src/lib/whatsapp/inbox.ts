import "server-only"
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "./database.types"
import type { AutomationEvent, Conversation, Message, Qualification } from "./types"
import { isWindowOpen } from "./window"

// The inbox reads as the signed-in user, so RLS decides what comes back. The
// shared client is typed from production, which has no wa_* tables until the
// migration is applied; this re-types it with the Phase C schema.
export async function inboxClient() {
  return (await createClient()) as unknown as SupabaseClient<Database>
}

// PostgREST answers PGRST205 (and Postgres 42P01) when a table does not exist:
// the migration has not been applied to this database yet.
function isMissingTable(error: PostgrestError | null) {
  return error?.code === "PGRST205" || error?.code === "42P01"
}

export type Loaded<T> = { state: "ready"; data: T } | { state: "not_set_up" } | { state: "error"; message: string }

function failed<T>(error: PostgrestError): Loaded<T> {
  return isMissingTable(error) ? { state: "not_set_up" } : { state: "error", message: error.message }
}

export type ConversationSummary = Conversation & {
  lead: { id: number; customer_name: string | null } | null
  assignee: { id: string; name: string | null } | null
  unread: boolean
  // Why this conversation needs a person now, if it does.
  // "handoff": the AI asked for a person and nobody has taken over yet.
  // "reply": a person has it, the customer wrote last, and it is the viewer's.
  attention: "handoff" | "reply" | null
}

const SUMMARY_COLUMNS =
  "*, lead:leads(id, customer_name), assignee:sales_users!wa_conversations_assigned_sales_id_fkey(id, name)"

type Row = Omit<ConversationSummary, "unread" | "attention">

type AttentionFields = Pick<
  Conversation,
  "mode" | "taken_over_by" | "assigned_sales_id" | "last_inbound_at" | "last_message_at"
>

// The one rule for "this chat waits for a person": the inbox order, the
// sidebar badge and the Overview's Needs you row all read it from here.
export function attentionOf(row: AttentionFields, viewerId: string): ConversationSummary["attention"] {
  if (row.mode !== "human") return null
  if (!row.taken_over_by) return "handoff"
  const customerWroteLast = !!row.last_inbound_at && row.last_inbound_at === row.last_message_at
  const mine = row.assigned_sales_id === viewerId || row.taken_over_by === viewerId
  return customerWroteLast && mine ? "reply" : null
}

function summarize(row: Row, viewerId: string): ConversationSummary {
  const unread =
    !!row.last_inbound_at && (!row.last_read_at || new Date(row.last_inbound_at) > new Date(row.last_read_at))

  return { ...row, unread, attention: attentionOf(row, viewerId) }
}

/**
 * Chats waiting for this person: handoffs nobody has taken yet, and taken-over
 * chats of theirs where the customer wrote last. RLS limits the rows to what
 * they may see. Null when the inbox tables do not exist yet or the query
 * failed, so callers hide the count instead of showing a false 0.
 */
export const countWaitingChats = cache(async (viewerId: string): Promise<number | null> => {
  const db = await inboxClient()
  const { data, error } = await db
    .from("wa_conversations")
    .select("mode, taken_over_by, assigned_sales_id, last_inbound_at, last_message_at")
    .eq("mode", "human")
    .limit(1000)
  if (error) {
    if (!isMissingTable(error)) console.error(`Counting waiting chats failed: ${error.message}`)
    return null
  }
  return (data ?? []).filter((row) => attentionOf(row, viewerId) !== null).length
})

const ATTENTION_ORDER = { handoff: 0, reply: 1 } as const

// Conversations that need a person come first; the rest keep newest-first order.
function byAttention(a: ConversationSummary, b: ConversationSummary) {
  const rank = (c: ConversationSummary) => (c.attention ? ATTENTION_ORDER[c.attention] : 2)
  return rank(a) - rank(b)
}

export type InboxData = { conversations: ConversationSummary[]; reviewCount: number }

export async function loadInbox(viewerId: string): Promise<Loaded<InboxData>> {
  const db = await inboxClient()

  const [list, review, unanswered] = await Promise.all([
    db
      .from("wa_conversations")
      .select(SUMMARY_COLUMNS)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200),
    db
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true)
      .is("resolved_at", null),
    unansweredQuery(db),
  ])

  if (list.error) return failed(list.error)
  if (review.error) return failed(review.error)
  if (unanswered.error) return failed(unanswered.error)

  return {
    state: "ready",
    data: {
      conversations: (list.data ?? []).map((row) => summarize(row as unknown as Row, viewerId)).sort(byAttention),
      reviewCount: (review.count ?? 0) + (unanswered.data ?? []).length,
    },
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LeadCandidate = { id: number; customer_name: string | null; phone: string | null }

export type ThreadData = {
  conversation: ConversationSummary
  messages: Message[]
  senders: Record<string, string>
  qualification: Qualification | null
  openEvents: AutomationEvent[]
  // Leads that share this number, when the match was ambiguous and is unresolved.
  candidates: LeadCandidate[]
  windowOpen: boolean
}

export async function loadThread(conversationId: string, viewerId: string): Promise<Loaded<ThreadData | null>> {
  // /inbox/<anything> reaches here; a value that is not an id is simply not a conversation.
  if (!UUID.test(conversationId)) return { state: "ready", data: null }
  const db = await inboxClient()

  const conversation = await db.from("wa_conversations").select(SUMMARY_COLUMNS).eq("id", conversationId).maybeSingle()
  if (conversation.error) return failed(conversation.error)
  if (!conversation.data) return { state: "ready", data: null }

  const [messages, qualification, events] = await Promise.all([
    db
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("wa_qualifications").select("*").eq("conversation_id", conversationId).maybeSingle(),
    db
      .from("automation_events")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("needs_review", true)
      .is("resolved_at", null)
      .order("created_at", { ascending: false }),
  ])

  const error = messages.error ?? qualification.error ?? events.error
  if (error) return failed(error)

  const row = summarize(conversation.data as unknown as Row, viewerId)
  const openEvents = events.data ?? []

  const candidateIds = row.lead_id
    ? []
    : openEvents
        .filter((e) => e.type === "lead_match_ambiguous")
        .flatMap((e) => ((e.detail as { lead_ids?: unknown }).lead_ids as number[] | undefined) ?? [])
  const senderIds = [...new Set((messages.data ?? []).map((m) => m.sender_sales_id).filter((id): id is string => !!id))]

  // RLS trims both lists to what this user may see; a missing name is shown as "FSI staff".
  const [candidates, senders] = await Promise.all([
    candidateIds.length
      ? db.from("leads").select("id, customer_name, phone").in("id", candidateIds).order("id")
      : Promise.resolve({ data: [] as LeadCandidate[], error: null }),
    senderIds.length
      ? db.from("sales_users").select("id, name").in("id", senderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }>, error: null }),
  ])

  return {
    state: "ready",
    data: {
      conversation: row,
      messages: (messages.data ?? []).reverse(),
      senders: Object.fromEntries((senders.data ?? []).map((s) => [s.id, s.name ?? "FSI staff"])),
      qualification: qualification.data,
      openEvents,
      candidates: candidates.data ?? [],
      windowOpen: isWindowOpen(row.last_inbound_at, new Date()),
    },
  }
}

export type ReviewEvent = AutomationEvent & {
  conversation: { id: string; wa_id: string; profile_name: string | null } | null
}

// A customer message the AI has not finished answering after this long means a
// run was cut off (timeout, platform limit) without logging anything.
const UNANSWERED_AFTER_MS = 3 * 60 * 1000

export type Unanswered = { id: string; wa_id: string; profile_name: string | null; ai_pending_since: string }
export type ReviewData = { events: ReviewEvent[]; unanswered: Unanswered[] }

function unansweredQuery(db: Awaited<ReturnType<typeof inboxClient>>) {
  return db
    .from("wa_conversations")
    .select("id, wa_id, profile_name, ai_pending_since")
    .eq("mode", "bot")
    .lt("ai_pending_since", new Date(Date.now() - UNANSWERED_AFTER_MS).toISOString())
    .order("ai_pending_since", { ascending: true })
    .limit(100)
}

export async function loadReview(): Promise<Loaded<ReviewData>> {
  const db = await inboxClient()
  const [events, unanswered] = await Promise.all([
    db
      .from("automation_events")
      .select("*, conversation:wa_conversations(id, wa_id, profile_name)")
      .eq("needs_review", true)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    unansweredQuery(db),
  ])

  if (events.error) return failed(events.error)
  if (unanswered.error) return failed(unanswered.error)
  return {
    state: "ready",
    data: {
      events: (events.data ?? []) as unknown as ReviewEvent[],
      unanswered: (unanswered.data ?? []) as Unanswered[],
    },
  }
}

export type Assignee = { id: string; name: string }

// Admin only: RLS lets only an Admin read the whole team.
export async function loadAssignees(): Promise<Assignee[]> {
  const db = await inboxClient()
  const { data } = await db
    .from("sales_users")
    .select("id, name, username, status")
    .neq("status", "Inactive")
    .order("name")
  return (data ?? []).map((u) => ({ id: u.id, name: u.name ?? u.username ?? "Unnamed user" }))
}

// The approved template staff can send once the 24-hour window has closed.
// Null until FSI has a template approved by Meta and names it in the env.
export function reengageTemplate() {
  const name = process.env.WHATSAPP_REENGAGE_TEMPLATE
  if (!name) return null
  return { name, languageCode: process.env.WHATSAPP_REENGAGE_TEMPLATE_LANG || "id" }
}
