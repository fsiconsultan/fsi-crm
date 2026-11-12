// FSI CRM service worker. It only shows notifications and opens the CRM when
// one is tapped. It caches nothing: CRM data is never stored offline.

// Only paths on this site; "//other.example" would otherwise leave the CRM.
function sameOriginPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/inbox"
  try {
    return new URL(value, self.location.origin).origin === self.location.origin ? value : "/inbox"
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
