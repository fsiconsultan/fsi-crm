import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { SERVICE_IDS, envStatus, identifiersFor, missingRequired, redactSecrets, supabaseProjectRef } = await import("./env")

// Every value below is a "secret" the page must never echo back.
const VALUES = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_LEAKME_pub_123456",
  SUPABASE_SECRET_KEY: "sb_secret_xLEAKME_server_123456",
  WHATSAPP_ACCESS_TOKEN: "EAALEAKMEtoken1234567890",
  WHATSAPP_PHONE_NUMBER_ID: "109876543210987",
  WHATSAPP_VERIFY_TOKEN: "LEAKME-verify-token-value",
  WHATSAPP_APP_SECRET: "LEAKMEappsecretvalue0001",
  OPENAI_API_KEY: "sk-proj-LEAKMEopenaikey000000",
  OPENAI_MODEL: "gpt-test-model",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BLEAKMEvapidpublickeyvalue",
  VAPID_PRIVATE_KEY: "LEAKMEvapidprivatekeyvalue",
  VAPID_SUBJECT: "mailto:LEAKME-subject@example.test",
  GOOGLE_CALENDAR_ID: "LEAKME-calendar@group.calendar.google.com",
  GOOGLE_SERVICE_ACCOUNT_JSON: '{"client_email":"LEAKME@x.iam","private_key":"LEAKMEPEM"}',
}

const NON_SECRET = new Set(["NEXT_PUBLIC_SUPABASE_URL", "OPENAI_MODEL"])

describe("env status helper", () => {
  it("never includes a variable's value in what the page receives", () => {
    const serialized = JSON.stringify(
      SERVICE_IDS.map((service) => ({
        env: envStatus(service, VALUES),
        ids: identifiersFor(service, VALUES),
        missing: missingRequired(service, VALUES),
      })),
    )
    for (const [name, value] of Object.entries(VALUES)) {
      if (NON_SECRET.has(name)) continue
      expect(serialized, name).not.toContain(value)
    }
    // The phone number id appears only as its last four digits.
    expect(serialized).toContain("ending 0987")
    expect(serialized).not.toContain("LEAKME")
  })

  it("reports names as set or missing, required first", () => {
    expect(envStatus("openai", { OPENAI_MODEL: "gpt-x", OPENAI_API_KEY: "  " })).toEqual([
      { name: "OPENAI_API_KEY", set: false, required: true },
      { name: "OPENAI_MODEL", set: true, required: true },
    ])
    expect(missingRequired("whatsapp", {})).toEqual([
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_APP_SECRET",
    ])
  })

  it("reads the Supabase project ref from the URL", () => {
    expect(supabaseProjectRef("https://yoyszukutqwoxxdolzcg.supabase.co")).toBe("yoyszukutqwoxxdolzcg")
    expect(supabaseProjectRef("not a url")).toBeNull()
  })

  it("redacts keys a provider echoes back", () => {
    const text = redactSecrets(
      "Incorrect API key provided: sk-proj-LEAKMEopenaikey000000. Token EAALEAKMEtoken1234567890 sb_secret_abc",
      VALUES,
    )
    expect(text).not.toContain("LEAKME")
    expect(text).toContain("[hidden]")
  })
})
