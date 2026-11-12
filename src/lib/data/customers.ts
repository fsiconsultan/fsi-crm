import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

// A "customer" is a row in `leads`; there is no separate customers table.

export const CUSTOMER_PAGE_SIZE = 25

export type CustomerListRow = Pick<
  Tables<"leads">,
  "id" | "customer_name" | "phone" | "business" | "location" | "status"
>

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

export async function listCustomers({
  query,
  page,
}: {
  query: string
  page: number
}): Promise<CustomerList> {
  const supabase = await createClient()
  const from = (page - 1) * CUSTOMER_PAGE_SIZE

  let request = supabase
    .from("leads")
    .select("id, customer_name, phone, business, location, status", { count: "exact" })

  const pattern = searchPattern(query)
  if (pattern) {
    request = request.or(
      `customer_name.ilike.${pattern},phone.ilike.${pattern},business.ilike.${pattern},location.ilike.${pattern}`,
    )
  }

  const { data, count, error } = await request
    .order("customer_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, from + CUSTOMER_PAGE_SIZE - 1)

  if (error) {
    // PGRST103: the requested page starts after the last row.
    if (error.code === "PGRST103") return { ok: true, rows: [], total: 0 }
    return { ok: false, message: error.message }
  }

  return { ok: true, rows: data ?? [], total: count ?? 0 }
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
