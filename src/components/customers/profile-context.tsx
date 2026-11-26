"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import type { CustomerField } from "@/app/(app)/customers/[id]/actions"
import type { Tables } from "@/lib/supabase/database.types"
import { EditSheet, type SalesChoices } from "./edit-customer"

type Notice = { ok: boolean; text: string }

type ProfileApi = {
  /** Opens the edit form with the cursor in `field`. */
  edit: (field?: CustomerField) => void
  notify: (notice: Notice) => void
}

const ProfileContext = createContext<ProfileApi>({ edit: () => {}, notify: () => {} })
const NoticeContext = createContext<{ notice: Notice | null; dismiss: () => void }>({ notice: null, dismiss: () => {} })

export function useProfile() {
  return useContext(ProfileContext)
}

/**
 * Holds the one edit form of the profile and the result line for every change
 * made on it, so any card can open the form at its own field ("Add a
 * follow-up date", "Edit notes", "Reassign") and every change reports in one place.
 */
export function ProfileProvider({
  customer,
  sales,
  currentSalesName,
  children,
}: {
  customer: Tables<"leads">
  sales: SalesChoices
  currentSalesName: string | null
  children: ReactNode
}) {
  // null: the form is closed. Otherwise the field it opened at.
  const [field, setField] = useState<CustomerField | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const api: ProfileApi = {
    edit: (target = "customer_name") => {
      setNotice(null)
      setField(target)
    },
    notify: setNotice,
  }

  return (
    <ProfileContext value={api}>
      <NoticeContext value={{ notice, dismiss: () => setNotice(null) }}>
        {children}
        <EditSheet
          customer={customer}
          sales={sales}
          currentSalesName={currentSalesName}
          field={field}
          onClose={() => setField(null)}
          onSaved={(text) => {
            setField(null)
            setNotice({ ok: true, text })
          }}
        />
      </NoticeContext>
    </ProfileContext>
  )
}

const noticeTone = {
  ok: "bg-positive-soft",
  failed: "bg-negative-soft",
} as const

/** The result of the last change made on this profile, under the header. */
export function ProfileNotice() {
  const { notice, dismiss } = useContext(NoticeContext)
  return (
    <div aria-live="polite">
      {notice ? (
        <div
          role={notice.ok ? "status" : "alert"}
          className={`mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-control)] py-1 pl-4 pr-1 text-sm text-ink ${noticeTone[notice.ok ? "ok" : "failed"]}`}
        >
          <p className="py-2">{notice.text}</p>
          <button
            type="button"
            onClick={dismiss}
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] hover:bg-surface md:size-10"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Dismiss message</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

// The quiet text action inside a card ("Add a follow-up date", "Edit notes").
export const cardLinkClass =
  "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] text-[13px] font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-[120ms] hover:decoration-ink md:min-h-8"

/** A text button that opens the edit form at one field. */
export function EditLink({ field, children }: { field: CustomerField; children: ReactNode }) {
  const { edit } = useProfile()
  return (
    <button type="button" onClick={() => edit(field)} className={cardLinkClass}>
      {children}
    </button>
  )
}
