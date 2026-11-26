import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import {
  groupWaitingChats,
  type PersonCounts,
  type TeamPerson,
  type TeamRow,
} from "@/components/sales/team-model"
import type { Period } from "@/lib/data/dashboard"
import { countLeads } from "@/lib/data/leads"
import { createClient } from "@/lib/supabase/server"
import { attentionOf } from "@/lib/whatsapp/inbox"

// The Sales team page's reads. Every lead number is a `countLeads` call, the
// same function behind the Overview cards and the Leads tabs, so a number here
// and the list it links to can never disagree. Runs as the signed-in Admin.

function isMissingTable(error: PostgrestError | null) {
  return error?.code === "PGRST205" || error?.code === "42P01"
}

const PERSON_COLUMNS = "id, name, username, role, status, photo_url, avatar_url"

type PersonRow = {
  id: string
  name: string | null
  username: string | null
  role: string | null
  status: string | null
  photo_url: string | null
  avatar_url: string | null
}

function toPerson(row: PersonRow): TeamPerson {
  return {
    id: row.id,
    name: row.name ?? row.username ?? "Unnamed user",
    username: row.username,
    role: row.role,
    status: row.status,
    photoUrl: row.photo_url ?? row.avatar_url,
  }
}

export async function personCounts(id: string, period: Period): Promise<PersonCounts> {
  const sales = id
  const [total, open, deals, added, followUpsDue, stale] = await Promise.all([
    countLeads({ sales }),
    countLeads({ sales, view: "open" }),
    countLeads({ sales, status: "Deal", sfrom: period.from, sto: period.to }),
    countLeads({ sales, from: period.from, to: period.to }),
    countLeads({ sales, view: "followup" }),
    countLeads({ sales, view: "stale" }),
  ])
  return { total, open, deals, added, followUpsDue, stale }
}

/** Waiting chats for the team and per person; null when WhatsApp is not set up or the read failed. */
export async function waitingChats(): Promise<{ total: number; byPerson: Record<string, number> } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("wa_conversations")
    .select("mode, taken_over_by, assigned_sales_id, last_inbound_at, last_message_at")
    .eq("mode", "human")
    .limit(1000)
  if (error) {
    if (!isMissingTable(error)) console.error(`Counting waiting chats failed: ${error.message}`)
    return null
  }
  return groupWaitingChats(data ?? [], attentionOf)
}

export type TeamSummary = {
  /** Open leads across the whole team, unassigned ones included (the Overview's "Open pipeline"). */
  open: number
  deals: number
  followUpsDue: number
  waitingChats: number | null
}

export type TeamPage = { rows: TeamRow[]; summary: TeamSummary }

export async function loadTeam(period: Period): Promise<TeamPage> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("sales_users").select(PERSON_COLUMNS).order("name", { ascending: true })
  if (error) throw new Error(`Loading the sales team failed: ${error.message}`)

  const people = (data ?? []).map(toPerson)
  const [counts, chats, open, deals, followUpsDue] = await Promise.all([
    Promise.all(people.map((person) => personCounts(person.id, period))),
    waitingChats(),
    countLeads({ view: "open" }),
    countLeads({ status: "Deal", sfrom: period.from, sto: period.to }),
    countLeads({ view: "followup" }),
  ])

  return {
    rows: people.map((person, index) => ({
      person,
      counts: counts[index],
      waitingChats: chats ? (chats.byPerson[person.id] ?? 0) : null,
    })),
    summary: { open, deals, followUpsDue, waitingChats: chats?.total ?? null },
  }
}

/** One person, or null when the id matches nobody this Admin can read. */
export async function getTeamPerson(id: string): Promise<TeamPerson | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("sales_users").select(PERSON_COLUMNS).eq("id", id).maybeSingle()
  if (error) throw new Error(`Loading this person failed: ${error.message}`)
  return data ? toPerson(data) : null
}

export type PersonChat = {
  id: string
  wa_id: string
  profile_name: string | null
  last_message_at: string | null
  last_message_preview: string | null
  lead: { id: number; customer_name: string | null } | null
  waiting: boolean
}

export type PersonChats =
  | { state: "ready"; chats: PersonChat[] }
  | { state: "not_set_up" }
  | { state: "error"; message: string }

const CHATS_SHOWN = 5

/** Their newest WhatsApp chats (taken over by them or assigned to them), waiting ones first. */
export async function personChats(id: string): Promise<PersonChats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("wa_conversations")
    .select(
      "id, wa_id, profile_name, mode, taken_over_by, assigned_sales_id, last_inbound_at, last_message_at, last_message_preview, lead:leads(id, customer_name)",
    )
    .or(`taken_over_by.eq.${id},assigned_sales_id.eq.${id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50)
  if (error) return isMissingTable(error) ? { state: "not_set_up" } : { state: "error", message: error.message }

  const chats = (data ?? []).map((row) => ({
    id: row.id,
    wa_id: row.wa_id,
    profile_name: row.profile_name,
    last_message_at: row.last_message_at,
    last_message_preview: row.last_message_preview,
    lead: row.lead,
    waiting: attentionOf(row, row.taken_over_by ?? row.assigned_sales_id ?? "") !== null,
  }))
  // Stable sort: waiting chats first, newest first within each group.
  chats.sort((a, b) => Number(b.waiting) - Number(a.waiting))
  return { state: "ready", chats: chats.slice(0, CHATS_SHOWN) }
}
