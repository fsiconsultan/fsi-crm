"use client"

import Link from "next/link"
import { useId, useState } from "react"
import type { ScheduleView } from "@/lib/schedules/types"

// The two outside steps of a schedule, each as a small badge: was it put on
// Google Calendar, was the lead emailed. A failure carries its reason: the
// badge is a button that shows it (hover shows it too). "Not connected" links
// Admins to Settings, where the connection is set up.

type Tone = "ok" | "neutral" | "fail"

const TONE: Record<Tone, string> = {
  ok: "bg-positive-soft text-ink",
  neutral: "bg-surface-sunken text-muted",
  fail: "bg-negative-soft text-ink",
}

type Badge = { label: string; tone: Tone; error: string | null; settings: boolean }

function googleBadge(google: ScheduleView["google"]): Badge {
  if (google.status === "synced") return { label: "Google synced", tone: "ok", error: null, settings: false }
  if (google.status === "failed") return { label: "Google failed", tone: "fail", error: google.error, settings: false }
  if (google.status === "pending") return { label: "Google pending", tone: "neutral", error: null, settings: false }
  return { label: "Google not connected", tone: "neutral", error: null, settings: true }
}

function emailBadge(email: ScheduleView["email"]): Badge {
  if (email.status === "sent") return { label: `Email sent to ${email.to ?? "the lead"}`, tone: "ok", error: null, settings: false }
  if (email.status === "failed") return { label: "Email failed", tone: "fail", error: email.error, settings: false }
  if (email.status === "not_connected") return { label: "Email not set up", tone: "neutral", error: null, settings: true }
  return { label: "Email not sent", tone: "neutral", error: null, settings: false }
}

// The visible chip is 24px; the control around it is 44px tall on phones and 32px from md up.
const hitClass =
  "-my-2.5 inline-flex min-h-11 max-w-full items-center rounded-full md:-my-1 md:min-h-8"
const chipClass = "inline-flex h-6 max-w-full items-center truncate rounded-full px-2 text-xs font-medium"

function BadgeChip({ badge, admin }: { badge: Badge; admin: boolean }) {
  const [open, setOpen] = useState(false)
  const errorId = useId()
  const chip = `${chipClass} ${TONE[badge.tone]}`

  if (badge.error) {
    return (
      <span className="flex min-w-0 max-w-full flex-col">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={errorId}
          title={badge.error}
          onClick={() => setOpen(!open)}
          className={hitClass}
        >
          <span className={`${chip} underline decoration-dotted underline-offset-2`}>{badge.label}</span>
          <span className="sr-only">, show why</span>
        </button>
        <span id={errorId} role="status" className="text-xs text-ink">
          {open ? badge.error : null}
        </span>
      </span>
    )
  }
  if (badge.settings && admin) {
    return (
      <Link href="/settings" className={`${hitClass} hover:opacity-80`}>
        <span className={chip}>{badge.label}</span>
        <span className="sr-only">, open Settings to connect it</span>
      </Link>
    )
  }
  return <span className={chip}>{badge.label}</span>
}

export function ScheduleBadges({ item, admin }: { item: ScheduleView; admin: boolean }) {
  return (
    <div className="mt-1.5 flex min-w-0 flex-wrap items-start gap-x-1.5 gap-y-1">
      <BadgeChip badge={googleBadge(item.google)} admin={admin} />
      <BadgeChip badge={emailBadge(item.email)} admin={admin} />
    </div>
  )
}
