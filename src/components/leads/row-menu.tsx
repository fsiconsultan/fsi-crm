"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleDot, ExternalLink, MoreHorizontal, Pencil, Trash2, UserRoundCog } from "lucide-react"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { cardMenuButtonClass } from "@/components/ui/pill"
import { DeleteLeadDialog } from "./delete-lead-button"
import { StatusDialog } from "./status-dialog"

const iconClass = "size-4 shrink-0 text-muted"

type Dialog = "status" | "delete"

/**
 * The "…" button on a lead row or card. Every action that changes something
 * opens a dialog first, so a stray tap never changes a lead. Icons: an open
 * arrow for leaving to the customer page, a pencil for editing, the status dot
 * used on the status filter, a person with a cog for reassigning, a bin for delete.
 */
export function RowMenu({
  leadId,
  leadName,
  status,
  editHref,
  reassignHref,
}: {
  leadId: number
  leadName: string
  status: string | null
  editHref: string
  /** Admin only; null hides Reassign. */
  reassignHref: string | null
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // A list shows a hundred menus; each dialog mounts the first time it is
  // opened and stays, so closing it can hand focus back to this button.
  const [mounted, setMounted] = useState<Record<Dialog, boolean>>({ status: false, delete: false })
  const show = (which: Dialog) => {
    setMounted({ ...mounted, [which]: true })
    setDialog(which)
  }

  return (
    <>
      <Menu
        label={`Actions for ${leadName}`}
        triggerLabel={`More actions for ${leadName}`}
        triggerClassName={cardMenuButtonClass}
        trigger={<MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />}
        placement="below-end"
        menuClassName="md:w-60"
      >
        {(close) => (
          <>
            <Link href={`/customers/${leadId}`} role="menuitem" tabIndex={-1} onClick={close} className={menuItemClass}>
              <ExternalLink aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Open customer
            </Link>
            <Link href={editHref} role="menuitem" tabIndex={-1} onClick={close} className={menuItemClass}>
              <Pencil aria-hidden="true" className={iconClass} strokeWidth={1.75} />
              Edit lead
            </Link>
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
            {reassignHref ? (
              <Link href={reassignHref} role="menuitem" tabIndex={-1} onClick={close} className={menuItemClass}>
                <UserRoundCog aria-hidden="true" className={iconClass} strokeWidth={1.75} />
                Reassign salesperson
              </Link>
            ) : null}
            {/* Only Admins may delete leads; Reassign is Admin-only too, so it marks an Admin here. */}
            {reassignHref ? (
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
                    Delete lead…
                  </span>
                </button>
              </>
            ) : null}
          </>
        )}
      </Menu>

      {mounted.status ? (
        <StatusDialog
          key={status ?? ""}
          leadId={leadId}
          leadName={leadName}
          status={status}
          open={dialog === "status"}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {mounted.delete ? (
        <DeleteLeadDialog leadId={leadId} leadName={leadName} open={dialog === "delete"} onClose={() => setDialog(null)} />
      ) : null}
    </>
  )
}
