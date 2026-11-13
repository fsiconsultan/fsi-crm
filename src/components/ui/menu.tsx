"use client"

import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/cn"

type Placement = "below-end" | "below-start" | "above-start"

// On phones every menu is a sheet above the bottom edge, so it never runs off a
// narrow screen and sits under the thumb. From md up it drops from its button.
const placements: Record<Placement, string> = {
  "below-end": "md:right-0 md:top-full md:mt-2",
  "below-start": "md:left-0 md:top-full md:mt-2",
  "above-start": "md:left-0 md:bottom-full md:mb-2",
}

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'

// Rows inside a menu. Exported so every menu item looks the same.
export const menuItemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-sm text-ink transition-colors duration-[120ms] hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-offset-0 aria-disabled:cursor-default aria-disabled:hover:bg-transparent md:min-h-10"

function items(menu: HTMLElement) {
  return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
}

// Stable (module-level) so React calls it once when the menu mounts: focus the
// checked item, or the first or last item depending on how the menu was opened.
function focusInitial(menu: HTMLElement | null) {
  if (!menu) return
  const all = items(menu)
  const checked = all.find((item) => item.getAttribute("aria-checked") === "true")
  const target = menu.dataset.focus === "last" ? all.at(-1) : (checked ?? all[0])
  target?.focus()
}

/**
 * A button that opens a menu (WAI-ARIA menu button pattern). Enter, Space or
 * Arrow Down open it on the first item, Arrow Up on the last; arrows, Home and
 * End move; Escape or Tab closes and returns focus to the button. A tap outside
 * closes it. Items are rendered by `children` with role menuitem, menuitemradio
 * or menuitemcheckbox; call `close` from an item that should close the menu.
 */
export function Menu({
  label,
  trigger,
  triggerLabel,
  triggerClassName,
  className,
  menuClassName,
  placement = "below-end",
  children,
}: {
  /** Accessible name of the menu itself. */
  label: string
  trigger: ReactNode
  /** Accessible name of the button when its content is only an icon. */
  triggerLabel?: string
  triggerClassName?: string
  className?: string
  menuClassName?: string
  placement?: Placement
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState<false | "first" | "last">(false)
  const menuId = useId()
  const buttonId = useId()

  const close = (returnFocus = true) => {
    setOpen(false)
    // Looked up by id rather than a ref: `close` is handed to the items during render.
    if (returnFocus) document.getElementById(buttonId)?.focus()
  }

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setOpen(event.key === "ArrowDown" ? "first" : "last")
    }
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items(event.currentTarget)
    const index = all.findIndex((item) => item === document.activeElement)
    const move = (next: number) => {
      event.preventDefault()
      all[(next + all.length) % all.length]?.focus()
    }
    if (event.key === "ArrowDown") move(index + 1)
    else if (event.key === "ArrowUp") move(index - 1)
    else if (event.key === "Home") move(0)
    else if (event.key === "End") move(all.length - 1)
    else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault()
      close()
    } else if (event.key === " " && index >= 0 && all[index].tagName === "A") {
      // Links only answer Enter natively; menu items answer Space too.
      event.preventDefault()
      all[index].click()
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open !== false}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close() : setOpen("first"))}
        onKeyDown={onButtonKeyDown}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open ? (
        <>
          <div aria-hidden="true" onClick={() => close(false)} className="fixed inset-0 z-40 max-md:bg-scrim/30" />
          <div
            ref={focusInitial}
            id={menuId}
            role="menu"
            aria-label={label}
            data-focus={open}
            onKeyDown={onMenuKeyDown}
            className={cn(
              "z-50 flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface-raised p-1.5 text-ink shadow-xl",
              "max-md:fixed max-md:inset-x-4 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:max-h-[70dvh] max-md:overflow-y-auto",
              "md:absolute md:min-w-56 md:max-h-[min(420px,70dvh)] md:overflow-y-auto",
              placements[placement],
              menuClassName,
            )}
          >
            {children(close)}
          </div>
        </>
      ) : null}
    </div>
  )
}
