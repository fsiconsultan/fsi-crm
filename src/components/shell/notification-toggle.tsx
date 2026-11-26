"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { menuItemClass } from "@/components/ui/menu"
import { isDeviceMine, removeDevice, saveDevice } from "@/lib/push/actions"

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

type State =
  | "checking"
  | "unsupported"
  | "install_ios" // iPhone/iPad in Safari: web push only works once added to the Home Screen
  | "blocked"
  | "off"
  | "on"

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true)
}

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function readState(): Promise<State> {
  if (!supported()) return isIos() && !isInstalled() ? "install_ios" : "unsupported"
  if (Notification.permission === "denied") return "blocked"
  const registration = await navigator.serviceWorker.getRegistration("/")
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription || Notification.permission !== "granted") return "off"
  // Only "on" when the server will actually notify this user on this device.
  return (await isDeviceMine(subscription.endpoint)) ? "on" : "off"
}

const NOTE: Partial<Record<State, string>> = {
  install_ios:
    "On iPhone, add FSI CRM to the Home Screen first: tap Share, then Add to Home Screen, and open it from there.",
  unsupported: "This browser cannot show notifications.",
  blocked: "Notifications are blocked for this site. Allow them in the browser's site settings, then reload.",
  on: "You get a notification when a chat needs you. Select to turn off.",
}

// Phone notifications for chats that need a person. Asks for permission only
// after a tap, and shows the real state of this device.
export function NotificationToggle() {
  const [state, setState] = useState<State>("checking")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    readState()
      .then((next) => live && setState(next))
      .catch(() => live && setState("unsupported"))
    return () => {
      live = false
    }
  }, [])

  // Not configured on the server yet: say so instead of hiding the item.
  if (!PUBLIC_KEY) return <UnavailableItem note="Not set up on the server yet." />
  if (state === "checking") return <UnavailableItem note="Checking this device..." />

  async function turnOn() {
    setBusy(true)
    setError(null)
    let subscription: PushSubscription | null = null
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off")
        return
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      await navigator.serviceWorker.ready
      subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY!) }))
      const saved = await saveDevice(subscription.toJSON(), navigator.userAgent)
      if (!saved.ok) {
        await subscription.unsubscribe().catch(() => undefined)
        setError(saved.error)
        setState("off")
        return
      }
      setState("on")
    } catch {
      // Nothing is saved, so do not leave the browser subscribed or show "on".
      await subscription?.unsubscribe().catch(() => undefined)
      setError("Notifications could not be turned on. Check the connection and try again.")
      setState(Notification.permission === "denied" ? "blocked" : "off")
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.getRegistration("/")
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const removed = await removeDevice(subscription.endpoint)
        if (!removed.ok) {
          setError(removed.error)
          return
        }
        // The server will not notify this device any more, so it is off even
        // if the browser fails to drop its subscription.
        await subscription.unsubscribe().catch(() => undefined)
      }
      setState("off")
    } catch {
      setError("Notifications could not be turned off. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const actionable = state === "on" || state === "off"
  const Icon = state === "on" ? Bell : BellOff
  const status = busy ? (state === "on" ? "Turning off..." : "Turning on...") : state === "on" ? "On" : "Off"
  const message = error ?? NOTE[state]
  const noteId = "notification-toggle-note"

  // A checkbox item in the profile menu. When the browser cannot be switched on
  // from here (blocked, unsupported, iPhone outside the Home Screen) it stays
  // focusable but disabled, and the note says what to do.
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={state === "on"}
      aria-disabled={!actionable || busy}
      aria-describedby={message ? noteId : undefined}
      tabIndex={-1}
      onClick={() => {
        if (!actionable || busy) return
        if (state === "on") turnOff()
        else turnOn()
      }}
      className={`${menuItemClass} py-2`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 self-start" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span>Notifications on this device</span>
          <span aria-hidden="true" className="text-xs text-muted">
            {status}
          </span>
        </span>
        {message ? (
          <span id={noteId} role={error ? "alert" : undefined} className={NOTE_TONE[error ? "error" : "note"]}>
            {message}
          </span>
        ) : null}
      </span>
    </button>
  )
}

const NOTE_TONE = {
  error: "mt-0.5 block text-xs text-negative",
  note: "mt-0.5 block text-xs text-muted",
} as const

function UnavailableItem({ note }: { note: string }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={false}
      aria-disabled
      aria-describedby="notification-toggle-note"
      tabIndex={-1}
      className={`${menuItemClass} py-2`}
    >
      <BellOff aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 self-start" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span>Notifications on this device</span>
          <span aria-hidden="true" className="text-xs text-muted">
            Off
          </span>
        </span>
        <span id="notification-toggle-note" className={NOTE_TONE.note}>
          {note}
        </span>
      </span>
    </button>
  )
}
