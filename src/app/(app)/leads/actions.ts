"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getProfile, isAdmin } from "@/lib/auth"
import { isDay } from "@/lib/leads/dates"
import { isUuid } from "@/lib/leads/filters"
import { LEAD_STATUSES, LEAD_TYPES, isLeadStatus } from "@/lib/leads/status"
import type { TablesUpdate } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { ok: boolean; message: string }

const FIELDS = [
  "customer_name",
  "phone",
  "email",
  "business",
  "location",
  "lead_type",
  "status",
  "sales_id",
  "follow_up_date",
  "appointment",
  "site_survey",
  "quotation",
  "notes",
] as const

export type LeadField = (typeof FIELDS)[number]

export type LeadFormState = {
  message: string | null
  errors: Partial<Record<LeadField, string>>
  values: Record<LeadField, string>
}

const DATE_FIELDS = ["follow_up_date", "appointment", "site_survey", "quotation"] as const
const MAX_LENGTH: Partial<Record<LeadField, number>> = {
  customer_name: 200,
  phone: 40,
  email: 200,
  business: 200,
  location: 300,
  notes: 5000,
}

const GONE = "This lead no longer exists or is not assigned to you. Go back to Leads and reload the list."

function revalidateLeadViews() {
  revalidatePath("/leads")
  revalidatePath("/")
}

function parseId(value: unknown) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Add or edit a lead. Mirrors the current CRM's customer form: name and phone
// are required, a non-admin's leads always belong to them, only Admin reassigns.
export async function saveLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const profile = await getProfile()
  const admin = isAdmin(profile)

  const values = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "").trim()]),
  ) as Record<LeadField, string>
  const rawId = String(formData.get("id") ?? "")
  const id = rawId ? parseId(rawId) : null
  const back = String(formData.get("back") ?? "")
  const errors: LeadFormState["errors"] = {}
  const fail = (message: string): LeadFormState => ({ message, errors, values })

  if (rawId && id === null) return fail(GONE)

  if (!values.customer_name) errors.customer_name = "Enter the customer's name."
  if (!values.phone) errors.phone = "Enter a phone or WhatsApp number."
  else if (!/\d{5,}/.test(values.phone.replace(/\D/g, ""))) {
    errors.phone = "This number looks too short. Include the full number."
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "This email address is not valid. Check it or leave it empty."
  }
  if (!(LEAD_TYPES as readonly string[]).includes(values.lead_type)) {
    errors.lead_type = "Choose Customer or Partner."
  }
  if (values.status && !isLeadStatus(values.status)) errors.status = "Choose a status from the list."
  for (const field of DATE_FIELDS) {
    if (values[field] && !isDay(values[field])) errors[field] = "Enter a valid date."
  }
  for (const [field, max] of Object.entries(MAX_LENGTH) as Array<[LeadField, number]>) {
    if (values[field].length > max) errors[field] = `Keep this under ${max} characters.`
  }
  if (admin && !isUuid(values.sales_id)) errors.sales_id = "Choose who this lead belongs to."

  const supabase = await createClient()

  const existing = id
    ? (await supabase.from("leads").select("id, status, sales_id").eq("id", id).maybeSingle()).data
    : null
  if (id && !existing) return fail(GONE)

  // A lead with no status keeps it until someone picks one; a status is never cleared.
  if (!values.status && existing?.status) errors.status = "Choose a status from the list."

  if (Object.keys(errors).length > 0) {
    return fail("The lead was not saved. Fix the marked fields and save again.")
  }

  const status = values.status || null
  const payload: TablesUpdate<"leads"> = {
    customer_name: values.customer_name,
    phone: values.phone,
    email: values.email || null,
    business: values.business || null,
    location: values.location || null,
    lead_type: values.lead_type,
    follow_up_date: values.follow_up_date || null,
    appointment: values.appointment || null,
    site_survey: values.site_survey || null,
    quotation: values.quotation || null,
    notes: values.notes || null,
    // created_by and updated_by hold sales_users.id in every existing row
    // (the current CRM writes profile.id), so the rebuild keeps that meaning.
    updated_by: profile.id,
  }
  if (admin) payload.sales_id = values.sales_id

  let notice: "created" | "updated"

  if (existing) {
    if (status && status !== existing.status) {
      payload.status = status
      payload.status_started_at = new Date().toISOString()
    }
    const { data, error } = await supabase.from("leads").update(payload).eq("id", existing.id).select("id")
    if (error) return fail(`The lead was not saved: ${error.message}. Try again.`)
    if (!data?.length) return fail(GONE)
    notice = "updated"
  } else {
    const { error } = await supabase.from("leads").insert({
      ...payload,
      status,
      status_started_at: status ? new Date().toISOString() : null,
      sales_id: admin ? values.sales_id : profile.id,
      created_by: profile.id,
    })
    if (error) return fail(`The lead was not saved: ${error.message}. Try again.`)
    notice = "created"
  }

  revalidateLeadViews()
  const target = back.startsWith("/leads") && !back.startsWith("//") ? back : "/leads"
  redirect(`${target}${target.includes("?") ? "&" : "?"}notice=${notice}`)
}

export async function changeLeadStatus(leadId: number, status: string): Promise<ActionResult> {
  const profile = await getProfile()
  const id = parseId(leadId)
  if (id === null || !isLeadStatus(status)) {
    return { ok: false, message: `Status not changed: choose one of ${LEAD_STATUSES.length} statuses in the list.` }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .update({ status, status_started_at: new Date().toISOString(), updated_by: profile.id })
    .eq("id", id)
    .select("id, customer_name")

  if (error) return { ok: false, message: `Status not changed: ${error.message}. Try again.` }
  if (!data?.length) return { ok: false, message: `Status not changed. ${GONE}` }

  revalidateLeadViews()
  return { ok: true, message: `${data[0].customer_name || "Lead"} is now ${status}.` }
}

// One lead per call, on purpose: there is no bulk delete.
export async function deleteLead(leadId: number): Promise<ActionResult> {
  await getProfile()
  const id = parseId(leadId)
  if (id === null) return { ok: false, message: `Nothing was deleted. ${GONE}` }

  const supabase = await createClient()
  const { data, error } = await supabase.from("leads").delete().eq("id", id).select("id, customer_name")

  if (error) return { ok: false, message: `Nothing was deleted: ${error.message}. Try again.` }
  if (!data?.length) return { ok: false, message: `Nothing was deleted. ${GONE}` }

  revalidateLeadViews()
  return { ok: true, message: `${data[0].customer_name || "The lead"} was deleted.` }
}
