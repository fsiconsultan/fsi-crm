"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Menu, menuItemClass } from "./menu"

// A menu of plain links, for server components that cannot pass the render
// function <Menu> takes (a card's "..." button).
export function LinkMenu({
  label,
  trigger,
  triggerLabel,
  triggerClassName,
  items,
}: {
  label: string
  trigger: ReactNode
  triggerLabel: string
  triggerClassName: string
  items: Array<{ label: string; href: string }>
}) {
  return (
    <Menu label={label} trigger={trigger} triggerLabel={triggerLabel} triggerClassName={triggerClassName} placement="below-end" menuClassName="md:w-64">
      {(close) =>
        items.map((item) => (
          <Link key={item.href} href={item.href} role="menuitem" tabIndex={-1} onClick={close} className={menuItemClass}>
            {item.label}
          </Link>
        ))
      }
    </Menu>
  )
}
