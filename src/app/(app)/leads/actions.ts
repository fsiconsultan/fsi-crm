"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { updateCustomer, type CustomerFormState } from "@/app/(app)/customers/[id]/actions"
import { getProfile, isAdmin } from "@/lib/auth"
import { isDay } from "@/lib/leads/dates"
import { isUuid } from "@/lib/leads/filters"
import { LEAD_TYPES, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = {
  ok: boolean
  message: string
  /** A page that resolves the failure, shown as a link next to the message. */
  link?: { href: string; label: string }
}

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
// Same limits and phone rule as the customer edit action, so a lead passes
// both forms or neither.
const MAX_LENGTH: Partial<Record<LeadField, number>> = {
  customer_name: 200,
  phone: 50,
  email: 200,
  business: 200,
  location: 300,
  notes: 5000,
}

const GONE = "This lead no longer exists or is not assigned to you. Go back to Leads and reload the list."
const CHANGED = "Someone else changed this lead since your list loaded. Reload the page to see its current status."

function revalidateLeadViews() {
  revalidatePath("/leads")
  revalidatePath("/")
}

function parseId(value: unknown) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function backTo(formData: FormData, notice: string) {
  const back = String(formData.get("back") ?? "")
  const target = back.startsWith("/leads") && !back.startsWith("//") ? back : "/leads"
  return `${target}${target.includes("?") ? "&" : "?"}notice=${notice}`
}

// Add a lead. Mirrors the current CRM's customer form: name and phone are
// required, a non-admin's leads always belong to them, only Admin assigns.
export async function createLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const profile = await getProfile()
  const admin = isAdmin(profile)

  const values = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "").trim()]),
  ) as Record<LeadField, string>
  const errors: LeadFormState["errors"] = {}

  if (!values.customer_name) errors.customer_name = "Enter the customer's name."
  if (!values.phone) errors.phone = "Enter a phone or WhatsApp number."
  else if (!/^[0-9+()\-.\s]+$/.test(values.phone) || values.phone.replace(/\D/g, "").length < 6) {
    errors.phone = "Use digits only, for example 0812 3456 7890 or +62 812 3456 7890."
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

  if (Object.keys(errors).length > 0) {
    return { message: "The lead was not added. Fix the marked fields and save again.", errors, values }
  }

  const status = values.status || null
  const supabase = await createClient()
  const { error } = await supabase.from("leads").insert({
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
    status,
    status_started_at: status ? new Date().toISOString() : null,
    sales_id: admin ? values.sales_id : profile.id,
    // created_by and updated_by hold sales_users.id in every existing row
    // (the current CRM writes profile.id), so the rebuild keeps that meaning.
    created_by: profile.id,
    updated_by: profile.id,
  })
  if (error) return { message: `The lead was not added: ${error.message}. Try again.`, errors: {}, values }

  revalidateLeadViews()
  redirect(backTo(formData, "created"))
}

// Edit a lead through the customer page's action, so both edit forms share one
// set of rules: only fields the user changed are validated and written, a
// status is written only when the user picked a new one, and the save is
// refused when the row changed after the form was opened (`loadedUpdatedAt`).
export async function editLead(
  leadId: number,
  loadedUpdatedAt: string,
  prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const idle: CustomerFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }
  const result = await updateCustomer(leadId, loadedUpdatedAt, idle, formData)

  if (result.result === "error") {
    const errors: LeadFormState["errors"] = {}
    const values = { ...prev.values }
    for (const field of FIELDS) {
      if (result.fieldErrors[field]) errors[field] = result.fieldErrors[field]
      if (result.values[field] !== undefined) values[field] = result.values[field]
    }
    return { message: result.message, errors, values }
  }

  revalidateLeadViews()
  redirect(backTo(formData, result.result === "saved" ? "updated" : "unchanged"))
}

// `from` is the status the row showed when the list rendered. The update only
// applies while the row still has it, so a status someone else set in the
// meantime (or the WhatsApp automation) is never overwritten from a stale list.
export async function changeLeadStatus(leadId: number, from: string | null, to: string): Promise<ActionResult> {
  const profile = await getProfile()
  const id = parseId(leadId)
  if (id === null) return { ok: false, message: `Status not changed. ${GONE}` }
  if (!isLeadStatus(to)) return { ok: false, message: "Status not changed: choose a status from the list." }
  if (to === from) return { ok: true, message: `Status is already ${to}.` }

  const supabase = await createClient()
  const update = supabase
    .from("leads")
    .update({ status: to, status_started_at: new Date().toISOString(), updated_by: profile.id })
    .eq("id", id)
  const { data, error } = await (from === null ? update.is("status", null) : update.eq("status", from)).select(
    "id, customer_name",
  )

  if (error) return { ok: false, message: `Status not changed: ${error.message}. Try again.` }
  if (!data?.length) {
    const { data: now, error: reloadError } = await supabase
      .from("leads")
      .select("status")
      .eq("id", id)
      .maybeSingle()
    if (reloadError) return { ok: false, message: "Status not changed, and the lead could not be reloaded. Try again." }
    if (!now) return { ok: false, message: `Status not changed. ${GONE}` }
    return {
      ok: false,
      message: `Status not changed. ${CHANGED} It is now ${now.status ?? NO_STATUS_LABEL}.`,
    }
  }

  revalidateLeadViews()
  return { ok: true, message: `${data[0].customer_name || "Lead"} is now ${to}.` }
}

// One lead per call, on purpose: there is no bulk delete.
export async function deleteLead(leadId: number): Promise<ActionResult> {
  await getProfile()
  const id = parseId(leadId)
  if (id === null) return { ok: false, message: `Nothing was deleted. ${GONE}` }

  const supabase = await createClient()

  // Deleting the lead removes its customer_documents rows (on delete cascade)
  // but not the PDFs in storage, which would be left with nothing pointing at
  // them. So a lead with documents is refused until they are removed on the
  // customer page, where the file and its row are deleted together.
  const { count, error: documentsError } = await supabase
    .from("customer_documents")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
  if (documentsError) {
    return { ok: false, message: "Nothing was deleted: the lead's documents could not be checked. Try again." }
  }
  if (count) {
    return {
      ok: false,
      message: `Nothing was deleted: this lead has ${count === 1 ? "1 document" : `${count} documents`}. Remove ${count === 1 ? "it" : "them"} on the customer page first, then delete the lead.`,
      link: { href: `/customers/${id}`, label: "Open the customer page" },
    }
  }

  const { data, error } = await supabase.from("leads").delete().eq("id", id).select("id, customer_name")

  if (error) return { ok: false, message: `Nothing was deleted: ${error.message}. Try again.` }
  if (!data?.length) return { ok: false, message: `Nothing was deleted. ${GONE}` }

  revalidateLeadViews()
  return { ok: true, message: `${data[0].customer_name || "The lead"} was deleted.` }
}
