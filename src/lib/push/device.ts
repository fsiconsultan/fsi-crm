import { removeDevice } from "./actions"

// Removes this browser's notifications for the signed-in user: the server row
// first, then the browser subscription. Used when signing out, so the next
// person on a shared phone never sees the previous user's notifications.
// Gives up after a few seconds: signing out must not hang on it.
export async function forgetThisDevice(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
  const work = (async () => {
    const registration = await navigator.serviceWorker.getRegistration("/")
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    await removeDevice(subscription.endpoint).catch(() => undefined)
    await subscription.unsubscribe().catch(() => undefined)
  })()
  await Promise.race([work.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 3000))])
}
