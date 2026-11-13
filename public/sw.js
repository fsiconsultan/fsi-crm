// FSI CRM service worker. It only shows notifications and opens the CRM when
// one is tapped. It caches nothing: CRM data is never stored offline.

// Opens only a conversation on this site (/inbox/<uuid>); anything else opens
// the inbox. Stops a payload like "//other.example" from leaving the CRM.
const CONVERSATION_PATH = /^\/inbox\/[0-9a-f-]{36}$/

function sameOriginPath(value) {
  if (typeof value !== "string") return "/inbox"
  try {
    const url = new URL(value, self.location.origin)
    return url.origin === self.location.origin && CONVERSATION_PATH.test(url.pathname) ? url.pathname : "/inbox"
  } catch {
    return "/inbox"
  }
}

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = typeof data.title === "string" && data.title ? data.title : "FSI CRM"
  const url = sameOriginPath(data.url)

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      data: { url },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(sameOriginPath(event.notification.data?.url), self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          try {
            // navigate() only works on pages this worker controls; otherwise open a new window.
            await client.navigate(url)
            await client.focus()
            return
          } catch {
            break
          }
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
