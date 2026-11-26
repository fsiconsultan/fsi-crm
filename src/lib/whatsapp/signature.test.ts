import { describe, expect, it } from "vitest"
import { signBody, verifySignature } from "./signature"

const SECRET = "test-app-secret"
const BODY = '{"object":"whatsapp_business_account","entry":[]}'

describe("verifySignature", () => {
  it("matches a known HMAC-SHA256 value", () => {
    // echo -n '<BODY>' | openssl dgst -sha256 -hmac test-app-secret
    expect(signBody(BODY, SECRET)).toBe(
      "sha256=c84a394cc475525991e78ff16e430b02e47f953877d2af0ade26956ce6f384dc",
    )
  })

  it("accepts the signature Meta would send for this body", () => {
    expect(verifySignature(BODY, signBody(BODY, SECRET), SECRET)).toBe(true)
  })

  it("rejects a body changed after signing", () => {
    expect(verifySignature(`${BODY} `, signBody(BODY, SECRET), SECRET)).toBe(false)
  })

  it("rejects a signature made with another secret", () => {
    expect(verifySignature(BODY, signBody(BODY, "other-secret"), SECRET)).toBe(false)
  })

  it("rejects a missing or malformed header", () => {
    expect(verifySignature(BODY, null, SECRET)).toBe(false)
    expect(verifySignature(BODY, "", SECRET)).toBe(false)
    expect(verifySignature(BODY, "sha256=abc", SECRET)).toBe(false)
    expect(verifySignature(BODY, signBody(BODY, SECRET).replace("sha256=", "sha1="), SECRET)).toBe(false)
  })

  it("rejects everything when the app secret is not configured", () => {
    expect(verifySignature(BODY, signBody(BODY, ""), undefined)).toBe(false)
    expect(verifySignature(BODY, signBody(BODY, ""), "")).toBe(false)
  })
})
