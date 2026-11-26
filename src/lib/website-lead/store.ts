import type { SupabaseClient } from "@supabase/supabase-js"
import { DOCUMENT_BUCKET } from "@/lib/data/documents"
import type { Database, Json } from "@/lib/supabase/database.types"

export type IngestInput = {
  submissionId: string
  form: "quote" | "chat"
  source: "website_quote" | "website_chat"
  name: string
  phone: string
  email: string
  location: string | null
  note: string
  quoteDetails: Json | null
}

export type IngestResult = {
  leadId: number
  created: boolean
  // The same submission id arrived before: nothing was written this time.
  replayed: boolean
  // Set when an earlier delivery of this submission already stored its photo.
  photoPath: string | null
  otherMatches: number[]
}

export type MeterPhoto = { leadId: number; submissionId: string; bytes: Uint8Array; mimeType: string; extension: string }

export interface WebsiteLeadStore {
  ingest(input: IngestInput): Promise<IngestResult>
  // Uploads the photo, records it as a customer document and on the submission.
  // Returns the storage path.
  saveMeterPhoto(photo: MeterPhoto): Promise<string>
}

// The admin client (server key): the website is not a signed-in user. Matching
// and creating happen in public.ingest_website_lead, in one transaction.
export function createSupabaseWebsiteLeadStore(db: SupabaseClient<Database>): WebsiteLeadStore {
  return {
    async ingest(input) {
      const { data, error } = await db
        .rpc("ingest_website_lead", {
          p_submission_id: input.submissionId,
          p_form: input.form,
          p_source: input.source,
          p_name: input.name,
          p_phone: input.phone,
          p_email: input.email,
          p_location: input.location,
          p_note: input.note,
          p_quote_details: input.quoteDetails,
        })
        .single()
      if (error) throw new Error(`Ingest website lead: ${error.message}`)
      return {
        leadId: data.lead_id,
        created: data.created,
        replayed: data.replayed,
        photoPath: data.photo_path,
        otherMatches: data.other_matches ?? [],
      }
    },

    async saveMeterPhoto(photo) {
      // Named after the submission, so a retried delivery overwrites its own file.
      const path = `${photo.leadId}/meter-photo-${photo.submissionId}.${photo.extension}`
      const upload = await db.storage
        .from(DOCUMENT_BUCKET)
        .upload(path, photo.bytes, { contentType: photo.mimeType, upsert: true })
      if (upload.error) throw new Error(`Upload meter photo: ${upload.error.message}`)

      const doc = await db.from("customer_documents").upsert(
        {
          customer_id: photo.leadId,
          document_type: "Meter Photo",
          file_name: `Meter photo (website).${photo.extension}`,
          file_path: path,
          file_size: photo.bytes.byteLength,
          mime_type: photo.mimeType,
          uploaded_by: null,
        },
        { onConflict: "file_path", ignoreDuplicates: true },
      )
      if (doc.error) throw new Error(`Record meter photo: ${doc.error.message}`)

      const mark = await db
        .from("website_submissions")
        .update({ photo_path: path })
        .eq("submission_id", photo.submissionId)
      if (mark.error) throw new Error(`Mark meter photo: ${mark.error.message}`)

      return path
    },
  }
}
