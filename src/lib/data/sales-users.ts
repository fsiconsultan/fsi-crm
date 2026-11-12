import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export type SalesMember = Pick<
  Tables<"sales_users">,
  "id" | "name" | "username" | "role" | "status" | "photo_url" | "avatar_url" | "created_at"
> & {
  // null when the count query failed; the UI says so instead of showing 0.
  leadCount: number | null
}

export type SalesTeam = { ok: true; members: SalesMember[] } | { ok: false; message: string }

export async function listSalesTeam(): Promise<SalesTeam> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales_users")
    .select("id, name, username, role, status, photo_url, avatar_url, created_at")
    .order("name", { ascending: true })

  if (error) return { ok: false, message: error.message }

  // One count per person: a single grouped read would be cut off at the API's
  // 1000-row limit (there are about 3000 leads).
  const members = await Promise.all(
    (data ?? []).map(async (member) => {
      const { count, error: countError } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("sales_id", member.id)
      return { ...member, leadCount: countError ? null : (count ?? 0) }
    }),
  )

  return { ok: true, members }
}

export type SalesOption = Pick<Tables<"sales_users">, "id" | "name" | "username" | "status">

// People a lead can be assigned to. RLS returns everyone for an Admin and only
// the caller's own row for other roles.
export async function listSalesOptions(): Promise<SalesOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("sales_users")
    .select("id, name, username, status")
    .order("name", { ascending: true })
  return data ?? []
}
