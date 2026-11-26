import { describe, expect, it } from "vitest"
import {
  MAX_PHOTO_BYTES,
  PHOTO_NOT_ALLOWED_YET,
  isOwnPhotoPath,
  photoPath,
  photoPathFromUrl,
  uploadFailureMessage,
  validatePhoto,
} from "./photo"

const JPEG = [0xff, 0xd8, 0xff, 0xe0]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]

function file(bytes: number[], name: string, type: string, size = bytes.length) {
  const body = new Uint8Array(size)
  body.set(bytes.slice(0, size))
  return new File([body], name, { type })
}

describe("validatePhoto", () => {
  it("accepts JPEG, PNG and WebP photos", async () => {
    expect(await validatePhoto(file(JPEG, "me.jpg", "image/jpeg", 100))).toBeNull()
    expect(await validatePhoto(file(PNG, "me.png", "image/png", 100))).toBeNull()
    expect(await validatePhoto(file(WEBP, "me.webp", "image/webp", 100))).toBeNull()
  })

  it("accepts a photo with no declared type when its name says what it is", async () => {
    expect(await validatePhoto(file(JPEG, "me.JPEG", "", 100))).toBeNull()
  })

  it("refuses other types", async () => {
    expect(await validatePhoto(file([0x47, 0x49, 0x46], "me.gif", "image/gif"))).toMatch(/JPEG, PNG or WebP/)
    expect(await validatePhoto(file([0x25, 0x50], "cv.pdf", ""))).toMatch(/JPEG, PNG or WebP/)
  })

  it("refuses an empty file", async () => {
    expect(await validatePhoto(new File([], "me.jpg", { type: "image/jpeg" }))).toMatch(/empty/)
  })

  it("refuses a photo over 2 MB and says its size", async () => {
    const message = await validatePhoto(file(JPEG, "me.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))
    expect(message).toMatch(/2\.0 MB/)
    expect(message).toMatch(/limit is 2 MB/)
    expect(await validatePhoto(file(JPEG, "me.jpg", "image/jpeg", MAX_PHOTO_BYTES))).toBeNull()
  })

  it("refuses a file named like a photo that is not one", async () => {
    expect(await validatePhoto(file([0x3c, 0x68, 0x74], "me.png", "image/png", 50))).toMatch(/not a JPEG, PNG or WebP/)
  })
})

describe("photo paths", () => {
  const id = "11111111-2222-4333-8444-555555555555"

  it("names each upload by time inside the person's folder", () => {
    expect(photoPath(id, "image/jpeg", 1763020800000)).toBe(`${id}/1763020800000.jpg`)
    expect(photoPath(id, "image/webp", 1)).toBe(`${id}/1.webp`)
  })

  it("accepts only one file directly inside the person's folder", () => {
    expect(isOwnPhotoPath(id, `${id}/1.jpg`)).toBe(true)
    expect(isOwnPhotoPath(id, "rist.jpeg")).toBe(false)
    expect(isOwnPhotoPath(id, `${id}/`)).toBe(false)
    expect(isOwnPhotoPath(id, `${id}/a/b.jpg`)).toBe(false)
    expect(isOwnPhotoPath(id, `${id}/..`)).toBe(false)
  })

  it("reads the storage path back from this project's public URL only", () => {
    const base = "https://example.supabase.co"
    expect(photoPathFromUrl(base, `${base}/storage/v1/object/public/sales-avatar/${id}/1.jpg`)).toBe(`${id}/1.jpg`)
    expect(photoPathFromUrl(base, `${base}/storage/v1/object/public/sales-avatar/rist.jpeg`)).toBe("rist.jpeg")
    expect(photoPathFromUrl(base, "https://elsewhere.test/storage/v1/object/public/sales-avatar/x.jpg")).toBeNull()
    expect(photoPathFromUrl(base, null)).toBeNull()
  })
})

describe("uploadFailureMessage", () => {
  it("explains a permission refusal", () => {
    expect(uploadFailureMessage({ message: "new row violates row-level security policy", statusCode: "403" })).toBe(
      PHOTO_NOT_ALLOWED_YET,
    )
  })

  it("passes other reasons through in plain words", () => {
    expect(uploadFailureMessage({ message: "Failed to fetch" })).toBe(
      "The photo was not uploaded: Failed to fetch. Check your connection and try again.",
    )
  })
})
