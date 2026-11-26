// The team works in Bali (WITA, UTC+8, no daylight saving), so "today" and
// period boundaries are Bali days whatever timezone the server runs in.
export const CRM_TIME_ZONE = "Asia/Makassar"

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const shortDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
})

const longDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** Bali calendar day (YYYY-MM-DD) of a timestamp. */
export function dayOf(timestamp: string | Date) {
  return isoDay.format(typeof timestamp === "string" ? new Date(timestamp) : timestamp)
}

export function today() {
  return dayOf(new Date())
}

export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromDay: string, toDay: string) {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000)
}

/** Monday of the week that contains `day`. */
export function weekStart(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
  return addDays(day, -((weekday + 6) % 7))
}

/** Start of a Bali day as a timestamp, for comparing against timestamptz columns. */
export function dayStart(day: string) {
  return `${day}T00:00:00+08:00`
}

export function formatDay(day: string, withYear = false) {
  return (withYear ? longDay : shortDay).format(new Date(`${day}T00:00:00Z`))
}

export function isDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}
