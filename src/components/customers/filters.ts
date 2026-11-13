import { LEAD_TYPES } from "@/lib/leads/status"

// The /customers URL holds every filter, so a filtered list survives a reload
// and can be shared. The page reads it and every filter link writes it here.

export const CUSTOMER_SORTS = {
  newest: "Newest added",
  oldest: "Oldest added",
  name: "Name, A to Z",
} as const

export type CustomerSort = keyof typeof CUSTOMER_SORTS

export const CUSTOMER_SORT_KEYS = ["newest", "oldest", "name"] as const satisfies readonly CustomerSort[]
export type CustomerType = (typeof LEAD_TYPES)[number]

export type CustomerFilters = {
  q: string
  /** A salesperson id. Only an Admin's list uses it. */
  sales: string
  type: CustomerType | ""
  docs: boolean
  chat: boolean
  sort: CustomerSort
  page: number
}

export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  q: "",
  sales: "",
  type: "",
  docs: false,
  chat: false,
  sort: "newest",
  page: 1,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RawParams = Record<string, string | string[] | undefined>

function first(raw: RawParams, key: string) {
  const value = raw[key]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

function isSort(value: string): value is CustomerSort {
  return value in CUSTOMER_SORTS
}

function isType(value: string): value is CustomerType {
  return (LEAD_TYPES as readonly string[]).includes(value)
}

/** Reads the URL. Anything unknown falls back to the default instead of failing. */
export function parseCustomerFilters(raw: RawParams): CustomerFilters {
  const sales = first(raw, "sales")
  const type = first(raw, "type")
  const sort = first(raw, "sort")
  const page = Number.parseInt(first(raw, "page"), 10)
  return {
    q: first(raw, "q").slice(0, 100),
    sales: UUID.test(sales) ? sales : "",
    type: isType(type) ? type : "",
    docs: first(raw, "docs") === "1",
    chat: first(raw, "chat") === "1",
    sort: isSort(sort) ? sort : "newest",
    page: Number.isSafeInteger(page) && page > 1 ? page : 1,
  }
}

/** Writes the URL, leaving out every value that is the default. */
export function customersHref(filters: CustomerFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.sales) params.set("sales", filters.sales)
  if (filters.type) params.set("type", filters.type)
  if (filters.docs) params.set("docs", "1")
  if (filters.chat) params.set("chat", "1")
  if (filters.sort !== "newest") params.set("sort", filters.sort)
  if (filters.page > 1) params.set("page", String(filters.page))
  const search = params.toString()
  return search ? `/customers?${search}` : "/customers"
}

/** True when anything narrows the list (the order and the page do not). */
export function isFiltered(filters: CustomerFilters) {
  return Boolean(filters.q || filters.sales || filters.type || filters.docs || filters.chat)
}
