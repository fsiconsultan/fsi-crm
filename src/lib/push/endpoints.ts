// The browsers' own push services. The server posts to a device's endpoint, so
// any other address would let a user point it at an arbitrary host. Same list
// as register_push_subscription in the push_subscriptions migration.
const EXACT = ["fcm.googleapis.com", "updates.push.services.mozilla.com"]
const DOMAINS = ["push.apple.com", "notify.windows.com"]

export function isPushServiceEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  return EXACT.includes(host) || DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}
