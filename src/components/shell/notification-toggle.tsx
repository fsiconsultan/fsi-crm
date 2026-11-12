"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { removeDevice, saveDevice } from "@/lib/push/actions"

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
  return subscription && Notification.permission === "granted" ? "on" : "off"
}

const NOTE: Partial<Record<State, string>> = {
  install_ios:
    "On iPhone, add FSI CRM to the Home Screen first: tap Share, then Add to Home Screen, and open it from there.",
  unsupported: "This browser cannot show notifications.",
  blocked: "Notifications are blocked for this site. Allow them in the browser's site settings, then reload.",
  on: "You get a notification when a chat needs you.",
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

  // Not configured on the server yet: nothing to offer.
  if (!PUBLIC_KEY || state === "checking") return null

  async function turnOn() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off")
        return
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY!) }))
      const saved = await saveDevice(subscription.toJSON(), navigator.userAgent)
      if (!saved.ok) {
        await subscription.unsubscribe()
        setError(saved.error)
        setState("off")
        return
      }
      setState("on")
    } catch {
      setError("Notifications could not be turned on in this browser.")
      setState(await readState().catch(() => "off" as const))
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
        await subscription.unsubscribe()
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
  const label = state === "on" ? "Notifications on" : actionable ? "Turn on notifications" : "Notifications off"
  const note = NOTE[state]

  return (
    <div className="flex flex-col">
      {actionable ? (
        <button
          type="button"
          onClick={state === "on" ? turnOff : turnOn}
          disabled={busy}
          aria-pressed={state === "on"}
          className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm text-ink transition-colors duration-150 hover:bg-surface disabled:opacity-50 md:min-h-10"
        >
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          {busy ? (state === "on" ? "Turning off..." : "Turning on...") : label}
          <span className="sr-only"> on this device</span>
        </button>
      ) : (
        <p className="flex min-h-11 items-center gap-3 px-3 text-sm text-ink md:min-h-10">
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          {label}
        </p>
      )}
      {note ? <p className="px-3 pb-1 pl-[42px] text-xs text-muted">{note}</p> : null}
      {error ? (
        <p role="alert" className="px-3 pb-1 pl-[42px] text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  )
}
