"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { SalesChoices } from "@/components/customers/edit-customer"
import type { ScheduleView } from "@/lib/schedules/types"
import { BookingDialog } from "./booking-dialog"
import type { BookingLead } from "./booking-model"
import { ConfirmDialog } from "./confirm-dialog"

/** What the screen knows about the outside connections and the viewer. Nothing secret: only "keys are set". */
export type ScheduleEnv = {
  admin: boolean
  googleConnected: boolean
  emailConnected: boolean
  /** Bali day */
  today: string
}

export type ScheduleTarget =
  | { kind: "book" }
  | { kind: "reschedule" | "cancel" | "done" | "confirm"; item: ScheduleView }

type ScheduleApi = {
  /** False while the schedules table is not set up: no booking anywhere. */
  canBook: boolean
  env: ScheduleEnv
  open: (target: ScheduleTarget) => void
}

const ScheduleContext = createContext<ScheduleApi | null>(null)

/** Null outside a customer profile (the calendar page lists without actions). */
export function useSchedules() {
  return useContext(ScheduleContext)
}

/**
 * Holds the one booking or confirm dialog of a customer profile, so the card's
 * "Book" button, the header menu and each row's menu all open the same dialog.
 * Each opening mounts a fresh dialog (new key), so no half-typed form leaks
 * from one opening to the next.
 */
export function ScheduleProvider({
  lead,
  env,
  sales,
  enabled,
  children,
}: {
  lead: BookingLead
  env: ScheduleEnv
  sales: SalesChoices
  enabled: boolean
  children: ReactNode
}) {
  const [session, setSession] = useState<{ id: number; target: ScheduleTarget } | null>(null)
  const [open, setOpen] = useState(false)

  const api: ScheduleApi = {
    canBook: enabled,
    env,
    open: (target) => {
      setSession({ id: (session?.id ?? 0) + 1, target })
      setOpen(true)
    },
  }
  const close = () => setOpen(false)
  const target = session?.target

  return (
    <ScheduleContext value={api}>
      {children}
      {session && target?.kind === "book" ? (
        <BookingDialog key={session.id} mode="create" lead={lead} env={env} sales={sales} open={open} onClose={close} />
      ) : null}
      {session && target?.kind === "reschedule" ? (
        <BookingDialog
          key={session.id}
          mode="reschedule"
          item={target.item}
          lead={lead}
          env={env}
          sales={sales}
          open={open}
          onClose={close}
        />
      ) : null}
      {session && (target?.kind === "cancel" || target?.kind === "done" || target?.kind === "confirm") ? (
        <ConfirmDialog key={session.id} action={target.kind} item={target.item} env={env} open={open} onClose={close} />
      ) : null}
    </ScheduleContext>
  )
}
