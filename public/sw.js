// FSI CRM service worker. It only shows notifications and opens the CRM when
// one is tapped. It caches nothing: CRM data is never stored offline.

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
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/inbox"

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
  const url = new URL(event.notification.data?.url || "/inbox", self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus()
          if ("navigate" in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
