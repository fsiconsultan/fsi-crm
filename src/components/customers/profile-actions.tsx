"use client"

import { useState } from "react"
import { CalendarPlus, CircleDot, MessageCircle, MoreHorizontal, Pencil, Phone, Trash2, UserRoundCog } from "lucide-react"
import { useSchedules } from "@/components/schedules/schedule-provider"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { pillClass } from "@/components/ui/pill"
import { DeleteCustomerDialog } from "./delete-customer-dialog"
import { useProfile } from "./profile-context"
import { StatusDialog } from "./status-dialog"

type Which = "status" | "delete"

const iconClass = "size-4 shrink-0 text-muted"

type Props = {
  customerId: number
  name: string
  status: string | null
  call: string | null
  whatsapp: string | null
  admin: boolean
  documentCount: number | null
}

/**
 * The profile's actions. From md up they sit right of the name: Call,
 * WhatsApp, Edit and a "…" menu. On a phone they become a bar pinned to the
 * bottom edge (Call, WhatsApp, "…"), where the thumb is; Edit moves into the menu.
 * Every change opens a dialog first, so a stray tap never changes the customer.
 */
export function ProfileActions(props: Props) {
  const { edit } = useProfile()
  const schedules = useSchedules()
  const [dialog, setDialog] = useState<Which | null>(null)
  // Each dialog mounts the first time it opens and stays, so closing it hands focus back to the menu button.
  const [mounted, setMounted] = useState<Record<Which, boolean>>({ status: false, delete: false })
  const show = (which: Which) => {
    setMounted({ ...mounted, [which]: true })
    setDialog(which)
  }

  const menu = (variant: "desktop" | "phone") => (
    <Menu
      label={`Actions for ${props.name}`}
      triggerLabel={`More actions for ${props.name}`}
      triggerClassName={pillClass("tinted", "w-11 justify-center px-0 md:w-10")}
      trigger={<MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />}
      placement="below-end"
      menuClassName="md:w-60"
    >
      {(close) => (
        <>
          {schedules?.canBook ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close()
                schedules.open({ kind: "book" })
              }}
              className={menuItemClass}
            >
              <CalendarPlus aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Book a schedule…
            </button>
          ) : null}
          {variant === "phone" ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close()
                edit()
              }}
              className={menuItemClass}
            >
              <Pencil aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Edit details
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              show("status")
            }}
            className={menuItemClass}
          >
            <CircleDot aria-hidden="true" className={iconClass} strokeWidth={1.75} />
            Change status…
          </button>
          {props.admin ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close()
                edit("sales_id")
              }}
              className={menuItemClass}
            >
              <UserRoundCog aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Reassign salesperson…
            </button>
          ) : null}
          {/* Only Admins may delete customers. */}
          {props.admin ? (
            <>
<div role="separator" className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              show("delete")
            }}
            className={menuItemClass}
          >
            <span className="flex items-center gap-3 text-negative">
              <Trash2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              Delete customer…
            </span>
          </button>
            </>
          ) : null}
        </>
      )}
    </Menu>
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 max-md:hidden">
        {props.call ? (
          <a href={props.call} className={pillClass("on")}>
            <Phone aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Call
          </a>
        ) : null}
        {props.whatsapp ? (
          <a href={props.whatsapp} target="_blank" rel="noopener noreferrer" className={pillClass("tinted")}>
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
        <button type="button" onClick={() => edit()} className={pillClass("tinted")}>
          <Pencil aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          Edit
        </button>
        {menu("desktop")}
      </div>

      {/* Phone: pinned above the bottom edge and the home indicator. The page leaves room for it. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-canvas px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {props.call ? (
          <a href={props.call} className={pillClass("on", "flex-1 justify-center")}>
            <Phone aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            Call
          </a>
        ) : null}
        {props.whatsapp ? (
          <a
            href={props.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={pillClass("tinted", "flex-1 justify-center")}
          >
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
        {props.call || props.whatsapp ? null : (
          <button type="button" onClick={() => edit("phone")} className={pillClass("tinted", "flex-1 justify-center")}>
            Add a phone number
          </button>
        )}
        {menu("phone")}
      </div>

      {mounted.status ? (
        <StatusDialog
          key={props.status ?? ""}
          customerId={props.customerId}
          name={props.name}
          status={props.status}
          open={dialog === "status"}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {mounted.delete ? (
        <DeleteCustomerDialog
          customerId={props.customerId}
          name={props.name}
          documentCount={props.documentCount}
          open={dialog === "delete"}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  )
}
