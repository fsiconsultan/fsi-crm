import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export type SalesOption = Pick<Tables<"sales_users">, "id" | "name" | "username" | "status">

// People a lead can be assigned to. RLS returns everyone for an Admin and only
// the caller's own row for other roles. A failed lookup is reported, never
// turned into an empty list: an empty list would read as "nobody to assign".
export type SalesOptions = { ok: true; options: SalesOption[] } | { ok: false; message: string }

export async function listSalesOptions(): Promise<SalesOptions> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sales_users")
    .select("id, name, username, status")
    .order("name", { ascending: true })
  if (error) return { ok: false, message: error.message }
  return { ok: true, options: data ?? [] }
}
