// WhatsApp allows free-form replies only within 24 hours of the customer's last
// message. After that only an approved template can be sent.
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export function isWindowOpen(lastInboundAt: string | null, now: Date) {
  if (!lastInboundAt) return false
  return now.getTime() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS
}
