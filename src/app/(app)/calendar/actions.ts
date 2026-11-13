"use server"

import type { CustomerSearchResult } from "@/components/schedules/customer-search"
import { getProfile } from "@/lib/auth"
import { searchBookingCustomers } from "@/lib/data/calendar"

const SEARCH_LIMIT = 8

// The booking dialog's customer step. Reads as the signed-in user, so RLS
// decides which customers can be found; the term is cleaned and quoted inside
// the leads query builder.
export async function searchBookingCustomersAction(q: string): Promise<CustomerSearchResult> {
  await getProfile()
  try {
    // One extra row says whether there are more matches than shown.
    const hits = await searchBookingCustomers(String(q).slice(0, 80), SEARCH_LIMIT + 1)
    return { ok: true, hits: hits.slice(0, SEARCH_LIMIT), more: hits.length > SEARCH_LIMIT }
  } catch (error) {
    console.error(error)
    return { ok: false }
  }
}
