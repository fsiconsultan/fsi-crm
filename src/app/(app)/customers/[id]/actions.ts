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

// How a stored value appears in its form control, so "the user did not touch
// it" compares equal. A single-line input drops line breaks; a textarea keeps
// them (as \n).
function asShown(value: string | null, multiline: boolean) {
  const text = value ?? ""
  return (multiline ? text.replace(/\r\n?/g, "\n") : text.replace(/[\r\n]+/g, "")).trim()
}

// `loadedUpdatedAt` is the row's `updated_at` when the form was opened ("" if
// it had none). The save is refused if the row has changed since, so a form
// left open cannot write its old values over someone else's edit (or over the
// WhatsApp automation's).
export async function updateCustomer(
  customerId: number,
  loadedUpdatedAt: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const profile = await getProfile()
  const admin = isAdmin(profile)
  const supabase = await createClient()

  // Only fields the form actually sent are considered. A field that is absent
  // (not rendered, or disabled) is never read as "empty" and never written.
  const values: CustomerFormState["values"] = {}
  const sent = (name: CustomerField) => {
    const raw = formData.get(name)
    if (typeof raw !== "string") return false
    values[name] = raw.replace(/\r\n?/g, "\n").trim()
    return true
  }

  const fail = (
    message: string,
    fieldErrors: CustomerFormState["fieldErrors"] = {},
  ): CustomerFormState => ({ result: "error", message, fieldErrors, values })

  const present = new Set<CustomerField>()
  for (const name of [...TEXT_FIELDS, ...DATE_FIELDS, "lead_type", "status"] as const) {
    if (sent(name)) present.add(name)
  }
  if (admin && sent("sales_id")) present.add("sales_id")

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

  const STALE =
    "Nothing was saved: this customer was changed by someone else since you opened this form. Close it and reload the page to see the latest details, then make your change again."
  if ((current.updated_at ?? "") !== loadedUpdatedAt) return fail(STALE)

  // Past this point the stored row is the one the form was filled from, so
  // "differs from the stored value" means "the user changed it". Only those
  // fields are validated and written; rows that predate these rules keep
  // their other values untouched.
  const changes: TablesUpdate<"leads"> = {}
  const fieldErrors: CustomerFormState["fieldErrors"] = {}

  for (const name of TEXT_FIELDS) {
    if (!present.has(name)) continue
    const next = values[name] ?? ""
    if (next === asShown(current[name], name === "notes")) continue

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
    if (!present.has(name)) continue
    const next = values[name] ?? ""
    if (next === (current[name] ?? "")) continue
    if (next && !isRealDate(next)) {
      fieldErrors[name] = "Pick a valid date."
    } else {
      changes[name] = next || null
    }
  }

  // A stored type or status outside today's lists (or none at all) stays as it
  // is unless the user picks a listed value.
  if (present.has("lead_type")) {
    const leadType = values.lead_type ?? ""
    if (leadType !== (current.lead_type ?? "")) {
      if ((LEAD_TYPES as readonly string[]).includes(leadType)) changes.lead_type = leadType
      else fieldErrors.lead_type = "Choose Customer or Partner."
    }
  }

  if (present.has("status")) {
    const status = values.status ?? ""
    if (status !== (current.status ?? "")) {
      if (isLeadStatus(status)) {
        changes.status = status
        changes.status_started_at = new Date().toISOString()
      } else {
        fieldErrors.status = "Choose a status from the list."
      }
    }
  }

  if (present.has("sales_id")) {
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

  // The same `updated_at` condition is part of the write, so an edit that
  // lands between the check above and this statement still cannot be overwritten.
  const guarded = supabase.from("leads").update(changes).eq("id", customerId)
  const { data: updated, error: updateError } = await (
    current.updated_at === null ? guarded.is("updated_at", null) : guarded.eq("updated_at", current.updated_at)
  ).select("id")

  if (updateError) {
    return fail(`Nothing was saved: ${updateError.message}. Try again.`)
  }
  if (!updated || updated.length === 0) {
    const { data: after } = await supabase.from("leads").select("updated_at").eq("id", customerId).maybeSingle()
    if (after && (after.updated_at ?? "") !== loadedUpdatedAt) return fail(STALE)
    return fail("Nothing was saved: you do not have permission to edit this customer.")
  }

  revalidatePath(`/customers/${customerId}`)
  revalidatePath("/customers")

  return { result: "saved", message: "Customer saved.", fieldErrors: {}, values: {} }
}
