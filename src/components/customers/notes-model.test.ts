import { describe, expect, it } from "vitest"
import { noteBlocks } from "./notes-model"

describe("noteBlocks", () => {
  it("splits website entries into a title, a time and labeled lines", () => {
    const notes = [
      "Called, wants a visit next week.",
      "",
      "2026-11-26 13:06 WITA: Quote request from the website",
      "Site: Villa",
      "Address: Jl. Test 1",
      "Map: https://www.google.com/maps?q=-8.650000,115.216700",
      "Message: Call after 5pm",
    ].join("\n")
    expect(noteBlocks(notes)).toEqual([
      { kind: "text", text: "Called, wants a visit next week." },
      {
        kind: "entry",
        when: "2026-11-26 13:06 WITA",
        title: "Quote request from the website",
        lines: [
          { label: "Site", text: "Villa" },
          { label: "Address", text: "Jl. Test 1" },
          { label: "Map", text: "Open map", href: "https://www.google.com/maps?q=-8.650000,115.216700" },
          { label: "Message", text: "Call after 5pm" },
        ],
      },
    ])
  })

  it("keeps staff notes as typed, and links only real map URLs", () => {
    expect(noteBlocks("line one\nline two")).toEqual([{ kind: "text", text: "line one\nline two" }])
    const [entry] = noteBlocks("2026-11-26 13:06 WITA: Chat message from the website\nMap: https://evil.example")
    expect(entry.kind === "entry" && entry.lines[0]).toEqual({ label: "Map", text: "https://evil.example" })
    expect(noteBlocks(null)).toEqual([])
    expect(noteBlocks("  ")).toEqual([])
  })
})
