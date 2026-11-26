import { whenEnglish, whenIndonesian, whenShort, type When } from "./time"
import type { ScheduleKind } from "./types"
import type { TimeZoneId } from "./zones"

// The short email to the lead, in English then Indonesian. Notes are internal
// and never included. Times are the customer's local time with its label
// ("10:00 WIB"), in the booking's own zone.

export const COMPANY = "French Solar Industry"

const KIND_EN: Record<ScheduleKind, string> = {
  appointment: "Appointment",
  site_survey: "Site survey",
  call: "Phone call",
  follow_up: "Follow-up call",
}
const KIND_ID: Record<ScheduleKind, string> = {
  appointment: "Janji temu",
  site_survey: "Survei lokasi",
  call: "Panggilan telepon",
  follow_up: "Panggilan tindak lanjut",
}

export type EmailPurpose = "new" | "rescheduled" | "cancelled"

export type LeadEmailInput = {
  purpose: EmailPurpose
  kind: ScheduleKind
  when: When
  /** The booking's zone (lead_schedules.time_zone). */
  timeZone: TimeZoneId
  location: string | null
  customerName: string | null
  salesName: string | null
  contactEmail: string
}

export function leadEmail(input: LeadEmailInput): { subject: string; text: string } {
  const kindEn = KIND_EN[input.kind]
  const kindId = KIND_ID[input.kind]
  const short = whenShort(input.when, input.timeZone)

  const subjectEn =
    input.purpose === "cancelled"
      ? `Cancelled: ${kindEn} with ${COMPANY}, ${short}`
      : input.purpose === "rescheduled"
        ? `New time: ${kindEn} with ${COMPANY}, ${short}`
        : `${kindEn} with ${COMPANY}, ${short}`

  const leadEn =
    input.purpose === "cancelled"
      ? `Your ${kindEn.toLowerCase()} with ${COMPANY} has been cancelled.`
      : input.purpose === "rescheduled"
        ? `Your ${kindEn.toLowerCase()} with ${COMPANY} has a new time.`
        : `This confirms your ${kindEn.toLowerCase()} with ${COMPANY}.`
  const leadId =
    input.purpose === "cancelled"
      ? `${kindId} Anda dengan ${COMPANY} dibatalkan.`
      : input.purpose === "rescheduled"
        ? `${kindId} Anda dengan ${COMPANY} dijadwalkan ulang.`
        : `Kami mengonfirmasi ${kindId.toLowerCase()} Anda dengan ${COMPANY}.`

  const greetingName = input.customerName?.trim() ? ` ${input.customerName.trim()}` : ""
  const seller = input.salesName?.trim() || `the ${COMPANY} team`
  const sellerId = input.salesName?.trim() || `tim ${COMPANY}`

  const en = [
    `Hello${greetingName},`,
    "",
    leadEn,
    "",
    `What: ${kindEn}`,
    `When: ${whenEnglish(input.when, input.timeZone)}`,
    input.location ? `Where: ${input.location}` : null,
    `With: ${seller}`,
    "",
    input.purpose === "cancelled"
      ? "The attached calendar file removes it from your calendar."
      : "Open the attached calendar file to add it to your calendar.",
    `Questions or a different time? Reply to this email or write to ${input.contactEmail}.`,
  ]
  const id = [
    `Halo${greetingName},`,
    "",
    leadId,
    "",
    `Kegiatan: ${kindId}`,
    `Waktu: ${whenIndonesian(input.when, input.timeZone)}`,
    input.location ? `Tempat: ${input.location}` : null,
    `Bersama: ${sellerId}`,
    "",
    input.purpose === "cancelled"
      ? "File kalender terlampir akan menghapusnya dari kalender Anda."
      : "Buka file kalender terlampir untuk menambahkannya ke kalender Anda.",
    `Ada pertanyaan atau ingin waktu lain? Balas email ini atau tulis ke ${input.contactEmail}.`,
  ]

  const text = [...en, "", "----", "", ...id, "", COMPANY]
    .filter((line): line is string => line !== null)
    .join("\n")
  return { subject: subjectEn, text }
}
