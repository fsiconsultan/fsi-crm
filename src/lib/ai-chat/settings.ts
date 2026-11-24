import { LEAD_STATUSES, isLeadStatus, type LeadStatus } from "@/lib/leads/status"
import type { Tables } from "@/lib/supabase/database.types"

// Settings for the AI auto chat (website and WhatsApp). Stored only: nothing
// reads them to answer customers until OpenAI and WhatsApp are connected.
// Shared by the page, the server actions and the browser upload, so no
// server-only imports here.

export type ChatSettings = Tables<"ai_chat_settings">
export type TriggerRule = Pick<
  Tables<"ai_chat_trigger_rules">,
  "id" | "name" | "trigger_description" | "target_status" | "enabled" | "auto_move" | "sort_order"
>
export type KnowledgeSource = Pick<
  Tables<"ai_knowledge_sources">,
  "id" | "kind" | "title" | "body" | "file_path" | "file_name" | "mime_type" | "file_size" | "status" | "created_at"
>

export const AI_CHAT_PAGE_META =
  "Admin and Developer only. Saved here for the AI that will answer website and WhatsApp chats."

export const TONES = [
  { value: "professional", label: "Professional" },
  { value: "natural", label: "Natural" },
  { value: "friendly", label: "Friendly" },
  { value: "custom", label: "Custom" },
] as const
export type Tone = (typeof TONES)[number]["value"]

export const LANGUAGE_MODES = [
  { value: "auto", label: "Match the customer (English or Indonesian)" },
  { value: "en", label: "Always English" },
  { value: "id", label: "Always Indonesian" },
] as const
export type LanguageMode = (typeof LANGUAGE_MODES)[number]["value"]

export const KNOWLEDGE_STATUS_LABEL: Record<string, string> = {
  pending_index: "Waiting for OpenAI",
  indexing: "Indexing",
  indexed: "Ready",
  failed: "Indexing failed",
}

// Matches the ai-knowledge bucket's own limits (20971520 bytes and these types).
export const KNOWLEDGE_BUCKET = "ai-knowledge"
export const MAX_KNOWLEDGE_BYTES = 20 * 1024 * 1024
export const KNOWLEDGE_TYPES: Record<string, { ext: string[]; label: string }> = {
  "application/pdf": { ext: [".pdf"], label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: [".docx"], label: "Word" },
  "image/png": { ext: [".png"], label: "PNG image" },
  "image/jpeg": { ext: [".jpg", ".jpeg"], label: "JPEG image" },
  "image/webp": { ext: [".webp"], label: "WebP image" },
  "text/plain": { ext: [".txt"], label: "Text" },
}
export const KNOWLEDGE_ACCEPT = Object.values(KNOWLEDGE_TYPES)
  .flatMap((type) => type.ext)
  .join(",")

export function targetStatusOptions() {
  return LEAD_STATUSES.map((status) => ({ value: status, label: status }))
}

export type FieldErrors = Record<string, string>
type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors }

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim()
}

function orNull(value: string) {
  return value === "" ? null : value
}

function done<T>(value: T, fieldErrors: FieldErrors): Parsed<T> {
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, value }
}

export function parseAutoChat(form: FormData) {
  const enabled = form.get("enabled") === "on"
  const model = text(form, "model")
  const fieldErrors: FieldErrors = {}
  if (model.length > 100) fieldErrors.model = "Keep the model name under 100 characters."
  else if (model && !/^[A-Za-z0-9._:-]+$/.test(model)) {
    fieldErrors.model = "Use the model name exactly as OpenAI writes it, with no spaces (for example gpt-4o-mini)."
  }
  if (enabled && !model) fieldErrors.model = "Enter the model before switching auto chat on."
  return done({ enabled, model: orNull(model) }, fieldErrors)
}

export function parsePersona(form: FormData) {
  const persona_name = text(form, "persona_name")
  const tone = text(form, "tone")
  const tone_custom = text(form, "tone_custom")
  const language_mode = text(form, "language_mode")
  const greeting_en = text(form, "greeting_en")
  const greeting_id = text(form, "greeting_id")
  const rules = text(form, "rules")
  const fieldErrors: FieldErrors = {}

  if (!persona_name) fieldErrors.persona_name = "Enter the name the AI uses in chat."
  else if (persona_name.length > 60) fieldErrors.persona_name = "Keep the name under 60 characters."
  if (!TONES.some((t) => t.value === tone)) fieldErrors.tone = "Choose a tone."
  if (tone === "custom" && !tone_custom) fieldErrors.tone_custom = "Describe the tone, or choose one of the others."
  if (tone_custom.length > 500) fieldErrors.tone_custom = "Keep the description under 500 characters."
  if (!LANGUAGE_MODES.some((m) => m.value === language_mode)) fieldErrors.language_mode = "Choose a language."
  if (greeting_en.length > 500) fieldErrors.greeting_en = "Keep the greeting under 500 characters."
  if (greeting_id.length > 500) fieldErrors.greeting_id = "Keep the greeting under 500 characters."
  if (rules.length > 4000) fieldErrors.rules = "Keep the rules under 4,000 characters."

  return done(
    {
      persona_name,
      tone,
      // Kept only for a custom tone, so switching away does not leave stale text behind.
      tone_custom: tone === "custom" ? tone_custom : null,
      language_mode,
      greeting_en: orNull(greeting_en),
      greeting_id: orNull(greeting_id),
      rules: orNull(rules),
    },
    fieldErrors,
  )
}

// Keywords are typed one per line or separated by commas. Matching later is
// case-insensitive, so they are stored lowercase without duplicates.
export function parseKeywords(raw: string) {
  const seen = new Set<string>()
  for (const part of raw.split(/[\n,]/)) {
    const keyword = part.trim().toLowerCase()
    if (keyword) seen.add(keyword)
  }
  return [...seen]
}

export function parseHandover(form: FormData) {
  const keywords = parseKeywords(String(form.get("handover_keywords") ?? ""))
  const failedRaw = text(form, "handover_max_failed_answers")
  const failed = Number(failedRaw)
  const message_en = text(form, "handover_message_en")
  const message_id = text(form, "handover_message_id")
  const fieldErrors: FieldErrors = {}

  if (keywords.length > 50) fieldErrors.handover_keywords = "Use at most 50 keywords."
  else if (keywords.some((k) => k.length > 60)) fieldErrors.handover_keywords = "Keep each keyword under 60 characters."
  if (!/^\d+$/.test(failedRaw) || failed < 1 || failed > 10) {
    fieldErrors.handover_max_failed_answers = "Enter a whole number from 1 to 10."
  }
  if (message_en.length > 500) fieldErrors.handover_message_en = "Keep the message under 500 characters."
  if (message_id.length > 500) fieldErrors.handover_message_id = "Keep the message under 500 characters."

  return done(
    {
      handover_keywords: keywords,
      handover_max_failed_answers: failed,
      handover_on_human_request: form.get("handover_on_human_request") === "on",
      handover_message_en: orNull(message_en),
      handover_message_id: orNull(message_id),
    },
    fieldErrors,
  )
}

export function parseRule(form: FormData) {
  const name = text(form, "name")
  const trigger_description = text(form, "trigger_description")
  const target_status = text(form, "target_status")
  const fieldErrors: FieldErrors = {}

  if (!name) fieldErrors.name = "Name the rule."
  else if (name.length > 120) fieldErrors.name = "Keep the name under 120 characters."
  if (!trigger_description) fieldErrors.trigger_description = "Describe what the customer says or does."
  else if (trigger_description.length > 2000) fieldErrors.trigger_description = "Keep it under 2,000 characters."
  if (!isLeadStatus(target_status)) fieldErrors.target_status = "Choose the stage to suggest."

  return done(
    {
      name,
      trigger_description,
      target_status: target_status as LeadStatus,
      enabled: form.get("enabled") === "on",
      // v1 only suggests moves. The column exists for later; it is never switched on here.
      auto_move: false,
    },
    fieldErrors,
  )
}

export function parseNote(form: FormData) {
  const title = text(form, "title")
  const body = text(form, "body")
  const fieldErrors: FieldErrors = {}
  if (!title) fieldErrors.title = "Give the note a title."
  else if (title.length > 200) fieldErrors.title = "Keep the title under 200 characters."
  if (!body) fieldErrors.body = "Write the note."
  else if (body.length > 20000) fieldErrors.body = "Keep the note under 20,000 characters, or upload it as a file."
  return done({ title, body }, fieldErrors)
}

// Returns a message for the user, or null when the file can be uploaded.
export function validateKnowledgeFile(file: { name: string; type: string; size: number }): string | null {
  const name = file.name.toLowerCase()
  const byType = KNOWLEDGE_TYPES[file.type]
  const byName = Object.values(KNOWLEDGE_TYPES).some((t) => t.ext.some((ext) => name.endsWith(ext)))
  if (file.type ? !byType : !byName) {
    return "This file type is not accepted. Upload a PDF, Word (.docx), PNG, JPEG, WebP or text (.txt) file."
  }
  if (file.size === 0) return "This file is empty. Choose a file that has content."
  if (file.size > MAX_KNOWLEDGE_BYTES) return "This file is over 20 MB. Compress or split it, then try again."
  return null
}

// The mime type the bucket checks. A file with no type from the browser gets one from its extension.
export function knowledgeMimeType(file: { name: string; type: string }) {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  return Object.entries(KNOWLEDGE_TYPES).find(([, t]) => t.ext.some((ext) => name.endsWith(ext)))?.[0] ?? ""
}

export function knowledgePath(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
  return `files/${Date.now()}_${crypto.randomUUID()}_${safeName}`
}

export function isKnowledgePath(path: unknown): path is string {
  return typeof path === "string" && /^files\/[A-Za-z0-9._-]+$/.test(path)
}
