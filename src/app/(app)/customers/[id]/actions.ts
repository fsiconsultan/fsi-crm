"use server"

import { revalidatePath } from "next/cache"
import { getProfile, isAdmin } from "@/lib/auth"
import { isLeadStatus, LEAD_TYPES } from "@/lib/leads/status"
import { createClient } from "@/lib/supabase/server"
import type { TablesUpdate } from "@/lib/supabase/database.types"

const TEXT_FIELDS = ["customer_name", "phone", "email", "business", "location", "notes"] as const
const DATE_FIELDS = ["appointment", "site_survey", "quotation", "closing", "follow_up_date"] as const

type TextField = (typeof TEXT_FIELDS)[number]
type DateField = (typeof DATE_FIELDS)[number]
export type CustomerField = TextField | DateField | "lead_type" | "status" | "sales_id"

export type CustomerFormState = {
  result: "idle" | "saved" | "unchanged" | "error"
  message: string
  fieldErrors: Partial<Record<CustomerField, string>>
  // What the user typed, so a failed save does not wipe the form.
  values: Partial<Record<CustomerField, string>>
}

const MAX_LENGTH: Record<TextField, number> = {
  customer_name: 200,
  phone: 50,
  email: 200,
  business: 200,
  location: 300,
  notes: 5000,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export async function updateCustomer(
  customerId: number,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const profile = await getProfile()
  const admin = isAdmin(profile)
  const supabase = await createClient()

  const read = (name: CustomerField) =>
    String(formData.get(name) ?? "")
      .replace(/\r\n/g, "\n")
      .trim()

  const values: CustomerFormState["values"] = {}
  for (const name of [...TEXT_FIELDS, ...DATE_FIELDS, "lead_type", "status"] as const) {
    values[name] = read(name)
  }
  if (admin) values.sales_id = read("sales_id")

  const fail = (
    message: string,
    fieldErrors: CustomerFormState["fieldErrors"] = {},
  ): CustomerFormState => ({ result: "error", message, fieldErrors, values })

  const { data: current, error: loadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", customerId)
    .maybeSingle()

  if (loadError) {
    return fail(`Nothing was saved: the customer could not be loaded (${loadError.message}). Try again.`)
  }
  if (!current) {
    return fail("Nothing was saved: this customer no longer exists or is not assigned to you.")
  }

  // Only fields that really changed are validated and written, so rows that
  // predate these rules keep their stored values untouched.
  const changes: TablesUpdate<"leads"> = {}
  const fieldErrors: CustomerFormState["fieldErrors"] = {}

  for (const name of TEXT_FIELDS) {
    const next = values[name] ?? ""
    const before = (current[name] ?? "").replace(/\r\n/g, "\n").trim()
    if (next === before) continue

    if (next.length > MAX_LENGTH[name]) {
      fieldErrors[name] = `Keep this under ${MAX_LENGTH[name]} characters.`
    } else if (name === "customer_name" && !next) {
      fieldErrors[name] = "Enter the customer's name."
    } else if (name === "phone" && !next) {
      fieldErrors[name] = "Enter a phone number."
    } else if (name === "phone" && (!/^[0-9+()\-.\s]+$/.test(next) || next.replace(/\D/g, "").length < 6)) {
      fieldErrors[name] = "Use digits only, for example 0812 3456 7890 or +62 812 3456 7890."
    } else if (name === "email" && next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      fieldErrors[name] = "This does not look like an email address."
    } else {
      changes[name] = next || null
    }
  }

  for (const name of DATE_FIELDS) {
    const next = values[name] ?? ""
    if (next === (current[name] ?? "")) continue
    if (next && !isRealDate(next)) {
      fieldErrors[name] = "Pick a valid date."
    } else {
      changes[name] = next || null
    }
  }

  const leadType = values.lead_type ?? ""
  if (leadType !== (current.lead_type ?? "")) {
    if ((LEAD_TYPES as readonly string[]).includes(leadType)) changes.lead_type = leadType
    else fieldErrors.lead_type = "Choose Customer or Partner."
  }

  const status = values.status ?? ""
  if (status !== (current.status ?? "")) {
    if (isLeadStatus(status)) {
      changes.status = status
      changes.status_started_at = new Date().toISOString()
    } else {
      fieldErrors.status = "Choose a status from the list."
    }
  }

  if (admin) {
    const salesId = values.sales_id ?? ""
    if (salesId !== (current.sales_id ?? "")) {
      if (!salesId) changes.sales_id = null
      else if (UUID.test(salesId)) changes.sales_id = salesId
      else fieldErrors.sales_id = "Choose a salesperson from the list."
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail("Nothing was saved. Fix the marked fields and save again.", fieldErrors)
  }

  if (Object.keys(changes).length === 0) {
    return { result: "unchanged", message: "No changes to save.", fieldErrors: {}, values }
  }

  // The existing rows store the sales_users id here (the current CRM writes
  // profile.id), so the same id is used to keep the column consistent.
  changes.updated_by = profile.id

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update(changes)
    .eq("id", customerId)
    .select("id")

  if (updateError) {
    return fail(`Nothing was saved: ${updateError.message}. Try again.`)
  }
  if (!updated || updated.length === 0) {
    return fail("Nothing was saved: you do not have permission to edit this customer.")
  }

  revalidatePath(`/customers/${customerId}`)
  revalidatePath("/customers")

  return { result: "saved", message: "Customer saved.", fieldErrors: {}, values: {} }
}
