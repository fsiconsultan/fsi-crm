"use client"

import { useRouter } from "next/navigation"
import { createContext, useContext, useState, type ReactNode } from "react"
import { CalendarPlus, Plus } from "lucide-react"
import type { SalesChoices } from "@/components/customers/edit-customer"
import { pillClass } from "@/components/ui/pill"
import { BookingDialog } from "./booking-dialog"
import { calendarHref, type CalendarParams } from "./calendar-params"
import { dayLabelLong, monthOf } from "./model"
import type { ScheduleEnv } from "./schedule-provider"

type CalendarBookingApi = {
  /** Today (Bali), the first day that can be booked. */
  today: string
  /** Opens the booking dialog at its customer step, starting on `day` when given. */
  open: (day?: string) => void
}

const CalendarBookingContext = createContext<CalendarBookingApi | null>(null)

/**
 * The Calendar page's booking: one dialog that starts with a customer search,
 * opened from the header's "New schedule" or from a day. Null context (no
 * buttons at all) while schedules are not set up. After a save the page
 * reloads its data, and on Close moves to the new item's month when it is
 * another one.
 */
export function CalendarBookingProvider({
  env,
  sales,
  enabled,
  params,
  children,
}: {
  env: ScheduleEnv
  sales: SalesChoices
  enabled: boolean
  params: CalendarParams
  children: ReactNode
}) {
  const router = useRouter()
  // `saved`: the office (Bali) day of the item this opening saved, if any: the calendar is laid out by it.
  const [session, setSession] = useState<{ id: number; day: string | undefined; saved: string | null } | null>(null)
  const [open, setOpen] = useState(false)

  const api: CalendarBookingApi = {
    today: env.today,
    open: (day) => {
      setSession({ id: (session?.id ?? 0) + 1, day, saved: null })
      setOpen(true)
    },
  }

  // The page reloads behind the result at once; a save in another month moves
  // there on Close, so the result never disappears under a navigation.
  const saved = (day: string) => {
    if (session) setSession({ ...session, saved: day })
    router.refresh()
  }

  const close = () => {
    setOpen(false)
    const day = session?.saved
    if (day && monthOf(day) !== params.month) {
      router.push(calendarHref({ ...params, month: monthOf(day), day: "" }), { scroll: false })
    }
  }

  return (
    <CalendarBookingContext value={enabled ? api : null}>
      {children}
      {enabled && session ? (
        <BookingDialog
          key={session.id}
          mode="create"
          lead={null}
          date={session.day}
          env={env}
          sales={sales}
          open={open}
          onClose={close}
          onSaved={(schedule) => saved(schedule.officeDay)}
        />
      ) : null}
    </CalendarBookingContext>
  )
}

/** The header's primary action. */
export function NewScheduleButton() {
  const booking = useContext(CalendarBookingContext)
  if (!booking) return null
  return (
    <button type="button" onClick={() => booking.open()} className={pillClass("on")}>
      <CalendarPlus aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      New schedule
    </button>
  )
}

/**
 * A month board day from today on: the whole cell is the target, so a click
 * on its empty space books that day. The "+" shows on hover and keyboard
 * focus, and always on touch screens. Items in the cell sit above it.
 */
export function DayBookButton({ day }: { day: string }) {
  const booking = useContext(CalendarBookingContext)
  if (!booking || day < booking.today) return null
  return (
    <button
      type="button"
      onClick={() => booking.open(day)}
      className="group/add absolute inset-0 flex cursor-pointer items-start justify-end rounded-none p-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full bg-line/70 text-ink opacity-0 transition-opacity duration-[120ms] group-hover/add:opacity-100 group-focus-visible/add:opacity-100 pointer-coarse:opacity-100"
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </span>
      <span className="sr-only">New schedule on {dayLabelLong(day)}</span>
    </button>
  )
}

/** The agenda's picked day, from today on: book straight onto it. */
export function DayBookLink({ day, className }: { day: string; className: string }) {
  const booking = useContext(CalendarBookingContext)
  if (!booking || day < booking.today) return null
  return (
    <button type="button" onClick={() => booking.open(day)} className={className}>
      Book on this day
    </button>
  )
}
