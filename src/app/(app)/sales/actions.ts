"use server"

import { FunctionsHttpError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { SALES_ROLES, SALES_STATUSES } from "@/components/sales/roles"
import { getProfile, isAdmin } from "@/lib/auth"
import { isUuid } from "@/lib/leads/filters"
import { SALES_AVATAR_BUCKET, isOwnPhotoPath, photoPathFromUrl } from "@/lib/sales/photo"
import { supabaseEnv } from "@/lib/supabase/env"
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

  revalidateTeam(salesUserId)
  return { result: "saved", message: `${name || "The profile"} was updated.`, fieldErrors: {}, values: {} }
}

function revalidateTeam(salesUserId: string) {
  revalidatePath("/sales")
  revalidatePath(`/sales/${salesUserId}`)
}

export type StatusChangeState = { result: "idle" | "saved" | "error"; message: string }

// Activate or deactivate one person from the confirm dialog. The Admin cannot
// change their own status here either: deactivating yourself locks you out.
export async function setSalespersonStatus(
  salesUserId: string,
  _prev: StatusChangeState,
  formData: FormData,
): Promise<StatusChangeState> {
  const status = String(formData.get("status") ?? "")
  const fail = (message: string): StatusChangeState => ({ result: "error", message })

  const profile = await getProfile()
  if (!isAdmin(profile)) return fail(NOT_ADMIN)
  if (!(SALES_STATUSES as readonly string[]).includes(status)) return fail("Nothing was saved: choose Active or Inactive.")
  if (salesUserId === profile.id) {
    return fail("Nothing was saved: you cannot change your own status. Ask another Admin to do it.")
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("sales_users")
    .update({ status })
    .eq("id", salesUserId)
    .select("id, name, username")

  if (error) return fail(`Nothing was saved: ${error.message}. Try again.`)
  const person = updated?.[0]
  if (!person) return fail("Nothing was saved: this person no longer exists, or you may not edit them.")

  revalidateTeam(salesUserId)
  const name = person.name ?? person.username ?? "This person"
  return {
    result: "saved",
    message: status === "Inactive" ? `${name} is now inactive and cannot sign in.` : `${name} is active again and can sign in.`,
  }
}

export type PhotoChangeResult = { result: "saved" | "error"; message: string }

// Saves (path) or clears (null) a person's photo after the browser uploaded the
// file to `<id>/<name>` in the public `sales-avatar` bucket. The public URL is
// built here, never taken from the browser. A save that fails takes the
// uploaded file back; an old file is deleted only from the person's own folder,
// so the photo at the bucket root (rist.jpeg) is never touched.
export async function setSalespersonPhoto(salesUserId: string, path: string | null): Promise<PhotoChangeResult> {
  const verb = path === null ? "removed" : "changed"
  const fail = (message: string): PhotoChangeResult => ({ result: "error", message })

  const profile = await getProfile()
  if (!isAdmin(profile)) return fail(`The photo was not ${verb}: only an Admin can change staff photos.`)
  if (!isUuid(salesUserId)) return fail(`The photo was not ${verb}: this person could not be found.`)
  if (path !== null && !isOwnPhotoPath(salesUserId, path)) {
    return fail("The photo was not changed: the file is not in this person's photo folder.")
  }

  const supabase = await createClient()
  const bucket = supabase.storage.from(SALES_AVATAR_BUCKET)

  // Takes back the file the browser just uploaded and says whether that worked.
  async function failAfterUpload(reason: string) {
    if (path === null) return fail(`The photo was not removed: ${reason}. Try again.`)
    const { data: removed, error } = await bucket.remove([path])
    const cleaned = !error && (removed?.length ?? 0) > 0
    return fail(
      cleaned
        ? `The photo was uploaded but could not be saved to the profile (${reason}). The uploaded file was removed again, so nothing changed. Try again.`
        : `The photo was uploaded but could not be saved to the profile (${reason}). The uploaded file could not be removed either and is now unused in storage; tell the developer.`,
    )
  }

  const { data: current, error: loadError } = await supabase
    .from("sales_users")
    .select("id, avatar_url")
    .eq("id", salesUserId)
    .maybeSingle()
  if (loadError) return failAfterUpload(loadError.message)
  if (!current) return failAfterUpload("this person no longer exists")

  const avatarUrl = path === null ? null : bucket.getPublicUrl(path).data.publicUrl
  const { data: updated, error: updateError } = await supabase
    .from("sales_users")
    .update({ avatar_url: avatarUrl })
    .eq("id", salesUserId)
    .select("id")
  if (updateError) return failAfterUpload(updateError.message)
  if (!updated || updated.length === 0) return failAfterUpload("you do not have permission to edit this person")

  revalidateTeam(salesUserId)
  revalidatePath("/", "layout")

  // The profile is saved. The old file goes only if it sits in this person's folder.
  const oldPath = photoPathFromUrl(supabaseEnv().url, current.avatar_url)
  let oldFileKept = false
  if (oldPath && oldPath !== path && isOwnPhotoPath(salesUserId, oldPath)) {
    const { data: removed, error } = await bucket.remove([oldPath])
    oldFileKept = Boolean(error) || (removed?.length ?? 0) === 0
  }

  const done = path === null ? "Photo removed." : "Photo saved."
  return {
    result: "saved",
    message: oldFileKept ? `${done} The old photo file could not be deleted from storage and is now unused.` : done,
  }
}
