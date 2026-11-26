import { describe, expect, it } from "vitest"
import { isPushServiceEndpoint } from "./endpoints"

describe("isPushServiceEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QGx",
    "https://wns2-par02p.notify.windows.com/w/?token=x",
  ])("accepts %s", (endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(true)
  })

  it.each([
    "https://evil.example/collect",
    "https://fcm.googleapis.com.evil.example/x",
    "https://evilpush.apple.com/x",
    "https://evil.example/fcm.googleapis.com/x",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
    "https://user:pass@fcm.googleapis.com/fcm/send/abc",
    "not a url",
    "",
  ])("rejects %j", (endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(false)
  })
})
