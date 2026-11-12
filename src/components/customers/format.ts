// Plain helpers shared by server and client customer components.

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Makassar",
})

// For `date` columns ("2026-11-12"): no time zone shift.
export function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date)
}

// For timestamps, shown in Bali time (WITA), where the team works.
export function formatDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_TIME_FORMAT.format(date)
}

// Today's date in Bali as "YYYY-MM-DD", comparable with `date` columns.
export function todayInBali() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date())
}

// Staff type local numbers (0812...), so a leading 0 becomes Indonesia's 62.
// Returns null when the stored value cannot be a phone number.
export function whatsappUrl(phone: string | null) {
  let digits = (phone ?? "").replace(/\D/g, "")
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`
  else if (digits.startsWith("8")) digits = `62${digits}`
  if (digits.length < 9 || digits.length > 15) return null
  return `https://wa.me/${digits}`
}
