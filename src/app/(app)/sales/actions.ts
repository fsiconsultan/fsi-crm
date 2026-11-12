"use server"

import { FunctionsHttpError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { SALES_ROLES, SALES_STATUSES } from "@/components/sales/roles"
import { getProfile, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { TablesUpdate } from "@/lib/supabase/database.types"

export type SalesFormState = {
  result: "idle" | "saved" | "unchanged" | "error"
  message: string
  fieldErrors: Partial<Record<"name" | "username" | "password" | "role" | "status", string>>
  // Never includes the password.
  values: Partial<Record<"name" | "username" | "role" | "status", string>>
}

const NOT_ADMIN = "Nothing was saved: only an Admin can manage the sales team."

// Creates the login and the sales_users row through the existing `create-sales`
// Edge Function, called with the signed-in admin's session. The function
// re-checks the Admin role itself and always creates the account as Sales.
export async function createSalesperson(
  _prev: SalesFormState,
  formData: FormData,
): Promise<SalesFormState> {
  const name = String(formData.get("name") ?? "").trim()
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const values = { name, username }

  const fail = (
    message: string,
    fieldErrors: SalesFormState["fieldErrors"] = {},
  ): SalesFormState => ({ result: "error", message, fieldErrors, values })

  const profile = await getProfile()
  if (!isAdmin(profile)) return fail(NOT_ADMIN)

  const fieldErrors: SalesFormState["fieldErrors"] = {}
  if (!name) fieldErrors.name = "Enter the person's name."
  else if (name.length > 120) fieldErrors.name = "Keep the name under 120 characters."
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
    fieldErrors.username = "Use 3 to 30 letters, numbers, dots, dashes or underscores, with no spaces."
  }
  if (password.length < 6) fieldErrors.password = "Use at least 6 characters."
  if (Object.keys(fieldErrors).length > 0) {
    return fail("The account was not created. Fix the marked fields and try again.", fieldErrors)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke("create-sales", {
    body: { name, username, password },
  })

  if (error) {
    let reason = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json()
        if (body && typeof body.error === "string") reason = body.error
      } catch {
        // The function answered without JSON; keep the HTTP error message.
      }
    }
    if (/already (been )?registered|duplicate|already exists/i.test(reason)) {
      return fail("The account was not created.", {
        username: "This username is already in use. Choose another one.",
      })
    }
    return fail(`The account was not created: ${reason}`)
  }

  if (!data || data.success !== true) {
    const reason = data && typeof data.error === "string" ? data.error : "the server gave no confirmation"
    return fail(`The account was not created: ${reason}`)
  }

  revalidatePath("/sales")
  return {
    result: "saved",
    message: `${name} can now sign in as "${username}" with the Sales role.`,
    fieldErrors: {},
    values: {},
  }
}

export async function updateSalesperson(
  salesUserId: string,
  _prev: SalesFormState,
  formData: FormData,
): Promise<SalesFormState> {
  const name = String(formData.get("name") ?? "").trim()
  const role = String(formData.get("role") ?? "")
  const status = String(formData.get("status") ?? "")
  const values = { name, role, status }

  const fail = (
    message: string,
    fieldErrors: SalesFormState["fieldErrors"] = {},
  ): SalesFormState => ({ result: "error", message, fieldErrors, values })

  const profile = await getProfile()
  if (!isAdmin(profile)) return fail(NOT_ADMIN)

  const supabase = await createClient()
  const { data: current, error: loadError } = await supabase
    .from("sales_users")
    .select("id, name, role, status")
    .eq("id", salesUserId)
    .maybeSingle()

  if (loadError) return fail(`Nothing was saved: ${loadError.message}. Try again.`)
  if (!current) return fail("Nothing was saved: this person no longer exists.")

  const changes: TablesUpdate<"sales_users"> = {}
  const fieldErrors: SalesFormState["fieldErrors"] = {}
  const isSelf = current.id === profile.id

  if (name !== (current.name ?? "").trim()) {
    if (!name) fieldErrors.name = "Enter the person's name."
    else if (name.length > 120) fieldErrors.name = "Keep the name under 120 characters."
    else changes.name = name
  }

  if (role !== (current.role ?? "")) {
    if (!(SALES_ROLES as readonly string[]).includes(role)) {
      fieldErrors.role = "Choose a role from the list."
    } else if (isSelf) {
      fieldErrors.role = "You cannot change your own role. Ask another Admin to do it."
    } else {
      changes.role = role
    }
  }

  if (status !== (current.status ?? "")) {
    if (!(SALES_STATUSES as readonly string[]).includes(status)) {
      fieldErrors.status = "Choose Active or Inactive."
    } else if (isSelf && status === "Inactive") {
      fieldErrors.status = "You cannot deactivate your own account: you would be signed out for good."
    } else {
      changes.status = status
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail("Nothing was saved. Fix the marked fields and save again.", fieldErrors)
  }
  if (Object.keys(changes).length === 0) {
    return { result: "unchanged", message: "No changes to save.", fieldErrors: {}, values }
  }

  const { data: updated, error: updateError } = await supabase
    .from("sales_users")
    .update(changes)
    .eq("id", salesUserId)
    .select("id")

  if (updateError) return fail(`Nothing was saved: ${updateError.message}. Try again.`)
  if (!updated || updated.length === 0) {
    return fail("Nothing was saved: you do not have permission to edit this person.")
  }

  revalidatePath("/sales")
  return { result: "saved", message: `${name || "The profile"} was updated.`, fieldErrors: {}, values: {} }
}
