"use client"

import Link from "next/link"
import { BadgeCheck, CalendarCheck, CalendarX, MoreHorizontal, Repeat } from "lucide-react"
import { IconCircle, type Tint } from "@/components/ui/icon-circle"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { cardMenuButtonClass } from "@/components/ui/pill"
import { SCHEDULE_KIND_LABEL, type ScheduleView } from "@/lib/schedules/types"
import { ScheduleBadges } from "./badges"
import { AiTags, KIND_ICON, StatePill } from "./kind"
import { aiBooking, type ItemState } from "./model"
import { useSchedules } from "./schedule-provider"
import { ZoneTime } from "./zone-time"

const TINT: Record<ItemState, Tint> = { scheduled: "blue", overdue: "pink", done: "grey", cancelled: "grey" }
const TITLE_TONE: Record<ItemState, string> = {
  scheduled: "text-ink",
  overdue: "text-ink",
  done: "text-ink",
  cancelled: "text-muted line-through decoration-muted",
}

// On the calendar page the customer's name leads and the title follows it.
const TITLE_WEIGHT = { alone: "font-medium", under: "" } as const

const menuIcon = "size-4 shrink-0 text-muted"

/**
 * One schedule: kind icon, title, when (customer's zone, plus Bali time when
 * it differs), where, who, its status and the
 * Google and email badges. On a customer profile the "…" menu moves, completes
 * or cancels it; each opens a dialog first. On the calendar page the title
 * links to the customer instead.
 */
export function ScheduleItem({
  item,
  state,
  today,
  admin,
  owner,
  customer,
}: {
  item: ScheduleView
  state: ItemState
  today: string
  admin: boolean
  /** The salesperson's name, shown to Admins. */
  owner?: string | null
  /** Set on the calendar page: who it is with, linked to their profile. */
  customer?: { id: number; name: string }
}) {
  const schedules = useSchedules()
  const Icon = KIND_ICON[item.kind]
  const detail = [item.location, admin ? (owner ?? "No salesperson") : null].filter(Boolean).join(" · ")

  return (
    <li className="flex items-start gap-3 py-3">
      <IconCircle icon={Icon} tint={TINT[state]} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {customer ? (
              <Link
                href={`/customers/${customer.id}`}
                className="-my-1 inline-flex min-h-8 max-w-full items-center text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                <span className="truncate">{customer.name}</span>
              </Link>
            ) : null}
            <p className={`break-words text-sm ${TITLE_WEIGHT[customer ? "under" : "alone"]} ${TITLE_TONE[state]}`}>{item.title}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <AiTags booking={aiBooking(item)} />
            <StatePill state={state} />
            {schedules && item.status === "scheduled" ? <ItemMenu item={item} /> : null}
          </div>
        </div>
        <p className="text-[13px] text-ink">
          <span className="text-muted">{SCHEDULE_KIND_LABEL[item.kind]} · </span>
          <ZoneTime item={item} today={today} />
        </p>
        {detail ? <p className="break-words text-[13px] text-muted">{detail}</p> : null}
        <ScheduleBadges item={item} admin={admin} />
      </div>
    </li>
  )
}

function ItemMenu({ item }: { item: ScheduleView }) {
  const schedules = useSchedules()
  if (!schedules) return null
  const kind = SCHEDULE_KIND_LABEL[item.kind].toLowerCase()
  return (
    <Menu
      label={`Actions for ${item.title}`}
      triggerLabel={`Actions for ${item.title}`}
      triggerClassName={cardMenuButtonClass}
      trigger={<MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />}
      placement="floating"
    >
      {(close) => (
        <>
          {item.needsConfirmation ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close()
                schedules.open({ kind: "confirm", item })
              }}
              className={menuItemClass}
            >
              <BadgeCheck aria-hidden="true" className={menuIcon} strokeWidth={1.75} />
              Confirm booking…
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              schedules.open({ kind: "reschedule", item })
            }}
            className={menuItemClass}
          >
            <Repeat aria-hidden="true" className={menuIcon} strokeWidth={1.75} />
            Reschedule…
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              schedules.open({ kind: "done", item })
            }}
            className={menuItemClass}
          >
            <CalendarCheck aria-hidden="true" className={menuIcon} strokeWidth={1.75} />
            Mark done…
          </button>
          <div role="separator" className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              schedules.open({ kind: "cancel", item })
            }}
            className={menuItemClass}
          >
            <span className="flex items-center gap-3 text-negative">
              <CalendarX aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              Cancel {kind}…
            </span>
          </button>
        </>
      )}
    </Menu>
  )
}
