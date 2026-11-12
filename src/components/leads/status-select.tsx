"use client"

import { useState, useTransition } from "react"
import { changeLeadStatus } from "@/app/(app)/leads/actions"
import { controlClass } from "@/components/ui/control"
import { cn } from "@/lib/cn"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, NO_STATUS_LABEL, isLeadStatus } from "@/lib/leads/status"
import { useLeadFeedback } from "./feedback"

export function StatusSelect({
  leadId,
  leadName,
  status,
}: {
  leadId: number
  leadName: string
  status: string | null
}) {
  const report = useLeadFeedback()
  const [value, setValue] = useState(status ?? "")
  const [pending, startTransition] = useTransition()

  const change = (next: string) => {
    const previous = value
    setValue(next)
    startTransition(async () => {
      try {
        const result = await changeLeadStatus(leadId, next)
        if (!result.ok) setValue(previous)
        report(result)
      } catch {
        setValue(previous)
        report({ ok: false, message: "Status not changed: the server could not be reached. Check your connection and try again." })
      }
    })
  }

  return (
    <select
      aria-label={`Status of ${leadName}`}
      value={value}
      disabled={pending}
      onChange={(event) => change(event.target.value)}
      className={cn(controlClass, "pr-8", !value && "text-muted", pending && "opacity-60")}
    >
      {/* Leads with no status, or a value from outside the list, keep showing what is stored. */}
      {!isLeadStatus(value) ? (
        <option value={value} disabled>
          {value || NO_STATUS_LABEL}
        </option>
      ) : null}
      {LEAD_STATUSES.map((option) => (
        <option key={option} value={option}>
          {LEAD_STATUS_SHORT[option]}
        </option>
      ))}
    </select>
  )
}
