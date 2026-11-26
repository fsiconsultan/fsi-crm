import { describe, expect, it } from "vitest"
import { isTimeZone, TIME_ZONES, zoneDescription, zoneForLocation, zoneLabel } from "./zones"

const WIB = "Asia/Jakarta"
const WITA = "Asia/Makassar"
const WIT = "Asia/Jayapura"

// Every leads.location value seen in the live data (read-only count, 2026-11-13).
const ONE_ZONE: Array<[string, string]> = [
  ["jakarta", WIB],
  ["bali", WITA],
  ["bandung", WIB],
  ["lombok", WITA],
  ["kuta mandalika", WITA],
  ["surabaya", WIB],
  ["denpasar bali", WITA],
  ["sorong", WIT],
  ["tangerang", WIB],
  ["yogyakarta", WIB],
  ["balikpapan", WITA],
  ["bogor", WIB],
  ["jakarta, tangerang", WIB],
  ["batam", WIB],
  ["palembang", WIB],
  ["raja ampat", WIT],
  ["bali sanur", WITA],
  ["nusa tenggara barat", WITA],
  ["papua", WIT],
  ["gili air lombok", WITA],
  ["ambon", WIT],
  ["banjarmasin", WITA],
  ["semarang", WIB],
  ["jayapura", WIT],
  ["bali canggu", WITA],
  ["nusa tenggara timur", WITA],
  ["bali uluwatu", WITA],
  ["karawang", WIB],
  ["samarinda", WITA],
  ["gili trawangan", WITA],
  ["makassar", WITA],
  ["dieng", WIB],
  ["bekasi", WIB],
  ["medan", WIB],
  ["sangatta", WITA],
  ["duri", WIB],
  ["paser", WITA],
  ["seminyak badung bali", WITA],
  ["nduga, papua pegunungan", WIT],
  ["sukabumi", WIB],
  ["merauke", WIT],
  ["pekalongan, jawa tengah", WIB],
  ["bali + lombok", WITA],
  ["timika", WIT],
  ["tanjung redeb", WITA],
  ["banyumas", WIB],
  ["bandar lampung", WIB],
  ["komodo", WITA],
  ["nusa lembogan", WITA],
  ["jimbaran", WITA],
  ["manado", WITA],
  ["tanjung enim", WIB],
  ["makasar", WITA],
  ["jakarta, surabaya", WIB],
]

describe("zoneForLocation", () => {
  it.each(ONE_ZONE)("%s is %s, confidently", (text, zone) => {
    expect(zoneForLocation(text)).toMatchObject({ zone, confident: true })
  })

  it("ignores case and punctuation", () => {
    expect(zoneForLocation("  JAKARTA SELATAN!! ")).toMatchObject({ zone: WIB, confident: true, matched: "jakarta" })
    expect(zoneForLocation("Kuta-Mandalika (NTB)")).toMatchObject({ zone: WITA, confident: true, matched: "kuta mandalika" })
    expect(zoneForLocation("Labuan Bajo, Flores")).toMatchObject({ zone: WITA, confident: true })
  })

  it("matches whole words only", () => {
    // "medan" is a WIB city, but "medang" is not a known place.
    expect(zoneForLocation("medang")).toEqual({ zone: WITA, confident: false })
    // "duri" (Riau) must not match inside another word.
    expect(zoneForLocation("durian street")).toEqual({ zone: WITA, confident: false })
  })

  it("returns the first place's zone, not confident, when the places span zones", () => {
    expect(zoneForLocation("jakarta, bali")).toEqual({ zone: WIB, confident: false, matched: "jakarta" })
    expect(zoneForLocation("bali, jakarta")).toEqual({ zone: WITA, confident: false, matched: "bali" })
    expect(zoneForLocation("Sorong / Makassar")).toEqual({ zone: WIT, confident: false, matched: "sorong" })
  })

  it("defaults to Bali time, not confident, when nothing is recognised", () => {
    for (const text of ["", "-", "zen villa", "   ", null, undefined]) {
      expect(zoneForLocation(text)).toEqual({ zone: WITA, confident: false })
    }
  })
})

describe("zone labels", () => {
  it("has the three zones with their labels and offsets", () => {
    expect(Object.keys(TIME_ZONES)).toEqual([WIB, WITA, WIT])
    expect([zoneLabel(WIB), zoneLabel(WITA), zoneLabel(WIT)]).toEqual(["WIB", "WITA", "WIT"])
    expect(zoneDescription(WIB)).toBe("WIB (Western Indonesia Time, UTC+7)")
    expect(isTimeZone("Asia/Jayapura")).toBe(true)
    expect(isTimeZone("Asia/Bangkok")).toBe(false)
    expect(isTimeZone("toString")).toBe(false)
  })
})
