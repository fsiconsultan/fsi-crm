"use server"

import { revalidatePath } from "next/cache"
import {
  KNOWLEDGE_BUCKET,
  KNOWLEDGE_TYPES,
  MAX_KNOWLEDGE_BYTES,
  isKnowledgePath,
  parseAutoChat,
  parseHandover,
  parseNote,
  parsePersona,
  parseRule,
  type FieldErrors,
} from "@/lib/ai-chat/settings"
import { canManageSettings, getProfile } from "@/lib/auth"
import { isUuid } from "@/lib/leads/filters"
import { createClient } from "@/lib/supabase/server"
import type { TablesUpdate } from "@/lib/supabase/database.types"

export type FormResult = {
  result: "idle" | "saved" | "error"
  message: string
  fieldErrors: FieldErrors
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

const DENIED = "Nothing was saved: only an Admin or a Developer can change the AI auto chat."
const FIX = "Nothing was saved. Fix the marked fields and try again."

// Every action is reachable by a direct POST, so each one checks the role
// itself. RLS checks it again in the database.
async function allowed() {
  const profile = await getProfile()
  return canManageSettings(profile) ? profile : null
}

function fail(message: string, fieldErrors: FieldErrors = {}): FormResult {
  return { result: "error", message, fieldErrors }
}

async function updateSettings(values: TablesUpdate<"ai_chat_settings">, savedMessage: string): Promise<FormResult> {
  const profile = await allowed()
  if (!profile) return fail(DENIED)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ai_chat_settings")
    .update({ ...values, updated_by: profile.id })
    .eq("id", 1)
    .select("id")
  if (error) return fail(`Nothing was saved: ${error.message}`)
  // RLS hides a refused update as "0 rows", not as an error.
  if (!data?.length) return fail("Nothing was saved: the database did not accept the change. Reload the page and try again.")
  revalidatePath("/ai-chat")
  return { result: "saved", message: savedMessage, fieldErrors: {} }
}

export async function saveAutoChat(_prev: FormResult, form: FormData): Promise<FormResult> {
  const parsed = parseAutoChat(form)
  if (!parsed.ok) return fail(FIX, parsed.fieldErrors)
  return updateSettings(
    { enabled: parsed.value.enabled, model: parsed.value.model, provider: "openai" },
    parsed.value.enabled ? "Saved. Auto chat is marked on." : "Saved. Auto chat is off.",
  )
}

export async function savePersona(_prev: FormResult, form: FormData): Promise<FormResult> {
  const parsed = parsePersona(form)
  if (!parsed.ok) return fail(FIX, parsed.fieldErrors)
  return updateSettings(parsed.value, "Persona saved.")
}

export async function saveHandover(_prev: FormResult, form: FormData): Promise<FormResult> {
  const parsed = parseHandover(form)
  if (!parsed.ok) return fail(FIX, parsed.fieldErrors)
  return updateSettings(parsed.value, "Handover rules saved.")
}

// Creates a rule when the form has no id, otherwise updates that rule.
export async function saveRule(_prev: FormResult, form: FormData): Promise<FormResult> {
  const profile = await allowed()
  if (!profile) return fail(DENIED)
  const parsed = parseRule(form)
  if (!parsed.ok) return fail(FIX, parsed.fieldErrors)

  const id = String(form.get("id") ?? "")
  const supabase = await createClient()

  if (!id) {
    const { data: last } = await supabase
      .from("ai_chat_trigger_rules")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()
    const { error } = await supabase.from("ai_chat_trigger_rules").insert({
      ...parsed.value,
      sort_order: (last?.sort_order ?? 0) + 10,
      created_by: profile.id,
      updated_by: profile.id,
    })
    if (error) return fail(`The rule was not added: ${error.message}`)
    revalidatePath("/ai-chat")
    return { result: "saved", message: `Rule "${parsed.value.name}" added.`, fieldErrors: {} }
  }

  if (!isUuid(id)) return fail("Nothing was saved: this rule could not be identified. Reload the page.")
  const { data, error } = await supabase
    .from("ai_chat_trigger_rules")
    .update({ ...parsed.value, updated_by: profile.id })
    .eq("id", id)
    .select("id")
  if (error) return fail(`Nothing was saved: ${error.message}`)
  if (!data?.length) return fail("Nothing was saved: the rule was not found. It may have been deleted; reload the page.")
  revalidatePath("/ai-chat")
  return { result: "saved", message: `Rule "${parsed.value.name}" saved.`, fieldErrors: {} }
}

export async function setRuleEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  const profile = await allowed()
  if (!profile) return { ok: false, message: DENIED }
  if (!isUuid(id)) return { ok: false, message: "Nothing was changed: this rule could not be identified." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ai_chat_trigger_rules")
    .update({ enabled, updated_by: profile.id })
    .eq("id", id)
    .select("id")
  if (error) return { ok: false, message: `Nothing was changed: ${error.message}` }
  if (!data?.length) return { ok: false, message: "Nothing was changed: the rule was not found. Reload the page." }
  revalidatePath("/ai-chat")
  return { ok: true, message: enabled ? "Rule switched on." : "Rule switched off." }
}

export async function deleteRule(id: string): Promise<ActionResult> {
  const profile = await allowed()
  if (!profile) return { ok: false, message: DENIED.replace("saved", "deleted") }
  if (!isUuid(id)) return { ok: false, message: "Nothing was deleted: this rule could not be identified." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("ai_chat_trigger_rules").delete().eq("id", id).select("id")
  if (error) return { ok: false, message: `Nothing was deleted: ${error.message}` }
  if (!data?.length) return { ok: false, message: "Nothing was deleted: the rule was already gone. Reload the page." }
  revalidatePath("/ai-chat")
  return { ok: true, message: "Rule deleted." }
}

export async function saveNote(_prev: FormResult, form: FormData): Promise<FormResult> {
  const profile = await allowed()
  if (!profile) return fail(DENIED)
  const parsed = parseNote(form)
  if (!parsed.ok) return fail(FIX, parsed.fieldErrors)
  const supabase = await createClient()
  const { error } = await supabase
    .from("ai_knowledge_sources")
    .insert({ kind: "note", title: parsed.value.title, body: parsed.value.body, created_by: profile.id })
  if (error) return fail(`The note was not added: ${error.message}`)
  revalidatePath("/ai-chat")
  return { result: "saved", message: `Note "${parsed.value.title}" added.`, fieldErrors: {} }
}

// Called by the browser after it has uploaded the file to Storage. On failure
// the browser removes the uploaded file again.
export async function recordKnowledgeFile(input: {
  title: string
  path: string
  fileName: string
  mimeType: string
  size: number
}): Promise<ActionResult> {
  const profile = await allowed()
  if (!profile) return { ok: false, message: DENIED }
  const title = String(input.title ?? "").trim() || String(input.fileName ?? "").trim()
  if (!isKnowledgePath(input.path)) return { ok: false, message: "The file's storage path is not valid." }
  if (!KNOWLEDGE_TYPES[input.mimeType]) return { ok: false, message: "This file type is not accepted." }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_KNOWLEDGE_BYTES) {
    return { ok: false, message: "The file size is not valid." }
  }
  if (!title || title.length > 200) return { ok: false, message: "Give the file a title under 200 characters." }

  const supabase = await createClient()
  const { error } = await supabase.from("ai_knowledge_sources").insert({
    kind: "file",
    title,
    file_path: input.path,
    file_name: String(input.fileName).slice(0, 255),
    mime_type: input.mimeType,
    file_size: input.size,
    created_by: profile.id,
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath("/ai-chat")
  return { ok: true, message: `"${title}" uploaded. It waits for indexing until OpenAI is connected.` }
}

// Removes the stored file first, then the record, so a failure never leaves a
// record pointing at nothing. A retry after a half-finished delete works.
export async function deleteKnowledgeSource(id: string): Promise<ActionResult> {
  const profile = await allowed()
  if (!profile) return { ok: false, message: DENIED.replace("saved", "deleted") }
  if (!isUuid(id)) return { ok: false, message: "Nothing was deleted: this source could not be identified." }
  const supabase = await createClient()

  const { data: source, error: readError } = await supabase
    .from("ai_knowledge_sources")
    .select("id, kind, file_path")
    .eq("id", id)
    .maybeSingle()
  if (readError) return { ok: false, message: `Nothing was deleted: ${readError.message}` }
  if (!source) return { ok: false, message: "Nothing was deleted: the source was already gone. Reload the page." }

  if (source.kind === "file" && source.file_path) {
    const { error: storageError } = await supabase.storage.from(KNOWLEDGE_BUCKET).remove([source.file_path])
    if (storageError) {
      return { ok: false, message: `Nothing was deleted: the file could not be removed from storage (${storageError.message}).` }
    }
  }

  const { data, error } = await supabase.from("ai_knowledge_sources").delete().eq("id", id).select("id")
  if (error) return { ok: false, message: `The file was removed but its entry was not: ${error.message}. Delete it again.` }
  if (!data?.length) return { ok: false, message: "The entry could not be deleted. Reload the page and try again." }
  revalidatePath("/ai-chat")
  return { ok: true, message: "Deleted." }
}
