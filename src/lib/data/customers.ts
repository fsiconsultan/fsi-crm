import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import type { CustomerFilters } from "@/components/customers/filters"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"
import { attentionOf } from "@/lib/whatsapp/inbox"

// A "customer" is a row in `leads`; there is no separate customers table.

export const CUSTOMER_PAGE_SIZE = 100

export type CustomerListRow = Pick<
  Tables<"leads">,
  "id" | "customer_name" | "phone" | "business" | "location" | "status" | "lead_type" | "sales_id" | "created_at"
> & {
  salesperson: { name: string | null; username: string | null } | null
  documentCount: number
}

export type CustomerSalesperson = Pick<
  Tables<"sales_users">,
  "id" | "name" | "username" | "role" | "status" | "photo_url" | "avatar_url"
>

export type Customer = Tables<"leads"> & { salesperson: CustomerSalesperson | null }

export type CustomerList =
  | { ok: true; rows: CustomerListRow[]; total: number }
  | { ok: false; message: string }

// Builds the quoted ILIKE pattern for a PostgREST `or` filter. Double quotes and
// backslashes would end or escape the quoted value, so they are dropped. `%`
// and `_` are escaped to match literally (the backslash is doubled because
// PostgREST unescapes the quoted value first). PostgREST turns `*` into `%`
// and has no escape for it, so a typed `*` becomes `_` (any one character).
function searchPattern(query: string) {
  const term = query
    .trim()
    .slice(0, 100)
    .replace(/["\\]/g, "")
    .replace(/[%_]/g, (char) => `\\\\${char}`)
    .replace(/\*/g, "_")
  return term ? `"%${term}%"` : null
}

// The list shows numbers as "+62 812 3456 7890", so staff may type them that
// way. A query made only of phone characters is also matched, as digits,
// against `phone_wa` (the stored number in WhatsApp form). A leading 0 or 62
// is dropped so "0812 3456" and "+62 812 3456" both find "62812 3456...".
function phoneDigits(query: string) {
  if (!/^[\d\s+()\-.]+$/.test(query)) return null
  const digits = query.replace(/\D/g, "").replace(/^(62|0)/, "")
  return digits.length >= 4 ? digits : null
}

function isMissingTable(error: PostgrestError | null) {
  return error?.code === "PGRST205" || error?.code === "42P01"
}

const LIST_COLUMNS =
  "id, customer_name, phone, business, location, status, lead_type, sales_id, created_at, salesperson:sales_users(name, username), customer_documents(id)"

export async function listCustomers(filters: CustomerFilters, admin: boolean): Promise<CustomerList> {
  const supabase = await createClient()
  const from = (filters.page - 1) * CUSTOMER_PAGE_SIZE

  // Leads that have a WhatsApp conversation, read first because the chat table
  // has its own row rules. Only needed when that filter is on.
  let chatLeadIds: number[] | null = null
  if (filters.chat) {
    const { data, error } = await supabase.from("wa_conversations").select("lead_id").not("lead_id", "is", null).limit(5000)
    if (error) {
      return {
        ok: false,
        message: isMissingTable(error)
          ? "WhatsApp chats are not set up in this database yet, so the chat filter cannot be used"
          : error.message,
      }
    }
    chatLeadIds = [...new Set((data ?? []).flatMap((row) => (row.lead_id === null ? [] : [row.lead_id])))]
    if (chatLeadIds.length === 0) return { ok: true, rows: [], total: 0 }
  }

  let request = supabase.from("leads").select(LIST_COLUMNS, { count: "exact" })

  const pattern = searchPattern(filters.q)
  if (pattern) {
    const digits = phoneDigits(filters.q)
    request = request.or(
      `customer_name.ilike.${pattern},phone.ilike.${pattern},business.ilike.${pattern},location.ilike.${pattern}${digits ? `,phone_wa.ilike.%${digits}%` : ""}`,
    )
  }
  // An Admin may narrow to one person; everyone else only sees their own rows anyway (RLS).
  if (admin && filters.sales) request = request.eq("sales_id", filters.sales)
  if (filters.type) request = request.eq("lead_type", filters.type)
  // Null filtering on an embedded table keeps only rows that have at least one.
  if (filters.docs) request = request.not("customer_documents", "is", null)
  if (chatLeadIds) request = request.in("id", chatLeadIds)

  const ordered =
    filters.sort === "name"
      ? request.order("customer_name", { ascending: true, nullsFirst: false }).order("id", { ascending: true })
      : request
          .order("created_at", { ascending: filters.sort === "oldest" })
          .order("id", { ascending: filters.sort === "oldest" })

  const { data, count, error } = await ordered.range(from, from + CUSTOMER_PAGE_SIZE - 1)

  if (error) {
    // PGRST103: the requested page starts after the last row.
    if (error.code === "PGRST103") return { ok: true, rows: [], total: count ?? 0 }
    return { ok: false, message: error.message }
  }

  const rows = (data ?? []).map(({ customer_documents, ...row }) => ({
    ...row,
    documentCount: customer_documents.length,
  }))
  return { ok: true, rows, total: count ?? 0 }
}

export type CustomerResult =
  | { ok: true; customer: Customer | null }
  | { ok: false; message: string }

// `customer: null` means the row does not exist or RLS hides it from this user;
// the two cases are indistinguishable by design.
export async function getCustomer(id: number): Promise<CustomerResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("leads")
    .select("*, salesperson:sales_users(id, name, username, role, status, photo_url, avatar_url)")
    .eq("id", id)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, customer: data }
}

export function parseCustomerId(raw: string): number | null {
  if (!/^\d{1,15}$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export const CHAT_MESSAGES_SHOWN = 3

export type ChatMessage = Pick<
  Tables<"wa_messages">,
  "id" | "body" | "message_type" | "sender_type" | "sender_sales_id" | "created_at" | "status"
>

export type CustomerChatConversation = Pick<
  Tables<"wa_conversations">,
  "id" | "mode" | "taken_over_by" | "assigned_sales_id" | "last_inbound_at" | "last_message_at" | "profile_name" | "wa_id"
> & { assignee: { id: string; name: string | null } | null }

export type CustomerChat =
  | { state: "not_set_up" }
  | { state: "error"; message: string }
  | { state: "none" }
  | {
      state: "ready"
      conversation: CustomerChatConversation
      attention: ReturnType<typeof attentionOf>
      /** Oldest first, at most CHAT_MESSAGES_SHOWN. */
      messages: ChatMessage[]
      /** Staff names by id for the messages people sent; RLS may hide some. */
      senders: Map<string, string>
    }

/**
 * This customer's latest WhatsApp conversation (linked by `lead_id`, see
 * docs/whatsapp.md) and its last few messages. Read as the signed-in user, so
 * RLS decides whether the chat is visible at all.
 */
export async function getCustomerChat(leadId: number, viewerId: string): Promise<CustomerChat> {
  const supabase = await createClient()

  const { data: conversation, error } = await supabase
    .from("wa_conversations")
    .select(
      "id, mode, taken_over_by, assigned_sales_id, last_inbound_at, last_message_at, profile_name, wa_id, assignee:sales_users!wa_conversations_assigned_sales_id_fkey(id, name)",
    )
    .eq("lead_id", leadId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) return isMissingTable(error) ? { state: "not_set_up" } : { state: "error", message: error.message }
  if (!conversation) return { state: "none" }

  const { data: messages, error: messagesError } = await supabase
    .from("wa_messages")
    .select("id, body, message_type, sender_type, sender_sales_id, created_at, status")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(CHAT_MESSAGES_SHOWN)

  if (messagesError) return { state: "error", message: messagesError.message }

  const senderIds = [...new Set((messages ?? []).flatMap((m) => (m.sender_sales_id ? [m.sender_sales_id] : [])))]
  const { data: people } = senderIds.length
    ? await supabase.from("sales_users").select("id, name").in("id", senderIds)
    : { data: [] }

  return {
    state: "ready",
    conversation,
    attention: attentionOf(conversation, viewerId),
    messages: (messages ?? []).reverse(),
    senders: new Map((people ?? []).flatMap((p) => (p.name ? [[p.id, p.name] as const] : []))),
  }
}
