import { describe, expect, it } from "vitest"
import { formatRelative } from "./format"

describe("relative time of a chat's last message", () => {
  const now = new Date("2026-11-13T04:00:00Z")
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

  it("steps from now to minutes, hours and days, then the date", () => {
    expect(formatRelative(ago(0), now)).toBe("now")
    expect(formatRelative(ago(5), now)).toBe("5 min ago")
    expect(formatRelative(ago(60), now)).toBe("1 h ago")
    expect(formatRelative(ago(23 * 60 + 59), now)).toBe("23 h ago")
    expect(formatRelative(ago(2 * 24 * 60), now)).toBe("2 d ago")
    expect(formatRelative("2026-10-01T03:00:00Z", now)).toBe("1 Oct")
  })
})
