import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/database.types"

// Shared by the server page (first load) and the browser panel (upload, open,
// delete), so the Supabase client is passed in. Either way it acts as the
// signed-in user and RLS decides what is visible.

export const DOCUMENT_BUCKET = "customer-documents"
export const DOCUMENT_TYPES = ["Quotation", "Proposal", "Company Profile", "Other"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

// Matches the bucket's own limit (10485760 bytes, application/pdf only).
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const SIGNED_URL_SECONDS = 120

export type CustomerDocument = Pick<
  Tables<"customer_documents">,
  "id" | "customer_id" | "document_type" | "file_name" | "file_path" | "file_size" | "uploaded_at"
>

export type DocumentList =
  | { ok: true; documents: CustomerDocument[] }
  | { ok: false; message: string }

export async function listDocuments(
  supabase: SupabaseClient<Database>,
  customerId: number,
): Promise<DocumentList> {
  const { data, error } = await supabase
    .from("customer_documents")
    .select("id, customer_id, document_type, file_name, file_path, file_size, uploaded_at")
    .eq("customer_id", customerId)
    .order("uploaded_at", { ascending: false })

  if (error) return { ok: false, message: error.message }
  return { ok: true, documents: data ?? [] }
}

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
}

// Returns a message for the user, or null when the file can be uploaded.
export async function validatePdf(file: File): Promise<string | null> {
  const namedPdf = file.name.toLowerCase().endsWith(".pdf")
  if (file.type ? file.type !== "application/pdf" : !namedPdf) {
    return "Only PDF files can be uploaded. Export the document as a PDF and choose it again."
  }
  if (file.size === 0) {
    return "This file is empty. Choose a PDF that has content."
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `This file is ${formatFileSize(file.size)}. The limit is 10 MB: compress the PDF or split it, then try again.`
  }
  const header = await file.slice(0, 5).text()
  if (header !== "%PDF-") {
    return "This file is named like a PDF but is not one. Export it again as a PDF."
  }
  return null
}

// Files live at `<lead id>/<file name>`; storage RLS reads the lead id from the folder.
export function documentPath(customerId: number, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
  return `${customerId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) return "Size unknown"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
