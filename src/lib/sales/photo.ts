// Staff photos in the public `sales-avatar` bucket. Shared by the browser
// dialog (checks and upload path) and the server action (path and URL checks).

export const SALES_AVATAR_BUCKET = "sales-avatar"
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

const PHOTO_TYPES = {
  "image/jpeg": { ext: "jpg", names: [".jpg", ".jpeg"] },
  "image/png": { ext: "png", names: [".png"] },
  "image/webp": { ext: "webp", names: [".webp"] },
} as const

type PhotoType = keyof typeof PHOTO_TYPES

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"

export const PHOTO_NOT_ALLOWED_YET =
  "Photo upload is not allowed yet. The storage rule for staff photos has not been applied to the database."

function isPhotoType(value: string): value is PhotoType {
  return value in PHOTO_TYPES
}

// The type a file really is, from its first bytes; null when it is none of the three.
function sniffType(bytes: Uint8Array): PhotoType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp"
  return null
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** A message for the person choosing the file, or null when it can be uploaded. */
export async function validatePhoto(file: File): Promise<string | null> {
  const lower = file.name.toLowerCase()
  const namedType = (Object.keys(PHOTO_TYPES) as PhotoType[]).find((type) =>
    PHOTO_TYPES[type].names.some((ending) => lower.endsWith(ending)),
  )
  const declared = isPhotoType(file.type) ? file.type : null
  if (file.type ? !declared : !namedType) {
    return "Choose a JPEG, PNG or WebP photo. Other file types cannot be used."
  }
  if (file.size === 0) return "This file is empty. Choose another photo."
  if (file.size > MAX_PHOTO_BYTES) {
    return `This photo is ${formatSize(file.size)}. The limit is 2 MB: choose a smaller photo or resize it, then try again.`
  }
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!sniffType(head)) {
    return "This file is named like a photo but is not a JPEG, PNG or WebP image. Choose another photo."
  }
  return null
}

/** The content type to upload with: what the bytes say, so a misnamed file is stored correctly. */
export async function photoContentType(file: File): Promise<PhotoType> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return sniffType(head) ?? "image/jpeg"
}

/** `<sales user id>/<timestamp>.<ext>`: a new name every time, so no cache shows the old photo. */
export function photoPath(salesUserId: string, type: PhotoType, now = Date.now()) {
  return `${salesUserId}/${now}.${PHOTO_TYPES[type].ext}`
}

/** True only for one file directly inside this person's folder, never the bucket root. */
export function isOwnPhotoPath(salesUserId: string, path: string) {
  const prefix = `${salesUserId}/`
  if (!path.startsWith(prefix)) return false
  const name = path.slice(prefix.length)
  return /^[A-Za-z0-9._-]+$/.test(name) && name !== "." && name !== ".."
}

/** The storage path behind a public photo URL of this project's bucket, or null for any other URL. */
export function photoPathFromUrl(publicBase: string, url: string | null) {
  if (!url) return null
  const prefix = `${publicBase.replace(/\/+$/, "")}/storage/v1/object/public/${SALES_AVATAR_BUCKET}/`
  if (!url.startsWith(prefix)) return null
  try {
    return decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0])
  } catch {
    return null
  }
}

/** Plain-English reason an upload to Storage failed. */
export function uploadFailureMessage(error: { message?: string; statusCode?: string | number } | null) {
  const text = `${error?.statusCode ?? ""} ${error?.message ?? ""}`
  if (/row-level security|row level security|unauthori[sz]ed|not authori[sz]ed|permission|\b403\b/i.test(text)) {
    return PHOTO_NOT_ALLOWED_YET
  }
  if (/payload too large|maximum allowed size|\b413\b/i.test(text)) {
    return "The photo was not uploaded: it is larger than the storage limit. Choose a smaller photo."
  }
  if (/mime type|invalid_mime|\b415\b/i.test(text)) {
    return "The photo was not uploaded: storage does not accept this file type. Use a JPEG, PNG or WebP photo."
  }
  const reason = error?.message?.trim() || "the storage server gave no reason"
  return `The photo was not uploaded: ${reason}. Check your connection and try again.`
}
