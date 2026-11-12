# FSI CRM design direction

Source of truth: `docs/design/reference-overview.jpg`, the "Overview" dashboard the project owner supplied on 2026-11-12. The owner asked for the CRM to match it exactly: same layout, type, controls and chart style. This file transcribes it. When this file and the image disagree, the image wins. Brand assets: `public/logo-fsi.jpg`.

The reference is a margin dashboard for another business. FSI's data is different (no revenue, targets or branches), so each reference slot is filled with real FSI data (see "Overview slot mapping"). Copy the look, never the content: no invented numbers, targets, money or labels.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Identity
- Product: internal CRM for French Solar Industry (Bali). Users: admin, sales, digital marketing, secretary. Daily use on desktop, quick checks and chat takeover on phone.
- Personality: calm, numeric, honest. Numbers are the hero; chrome stays quiet; text is short.
- Identity motif: diagonal hatching inside bars and progress fills (`.hatch`). Solid fill marks "now" (current week, the final result); hatching marks history, totals and losses. Never decoration.

## Palette (tokens in `src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | #f2f2f0 | #121212 | App background and sidebar |
| `surface` | #fafaf9 | #1b1b1b | Cards (a touch lighter than canvas, as in the reference) |
| `surface-raised` | #ffffff | #242424 | Controls, the date chip, inner callouts, white buttons |
| `line` | #e6e6e3 | #2c2c2c | Card borders, dividers |
| `ink` | #141414 | #f1f1ef | Text, active nav background |
| `muted` | #636363 | #a3a3a3 | Secondary text (AA on surface and canvas) |
| `accent` | #2457e6 | #7d9bff | Current-period bars, solid final bar, focus ring |
| `negative` | #c42a5f | #ff7aa6 | Losses, drop-offs, overdue, failures (pink, as in the reference waterfall) |
| `positive` | #17803d | #5fd18b | Gains |
| `warning` | #9a5b00 | #f2b95c | Amber icon tint in "Needs you" |
| `sun` | #f0a35e | #f0a35e | Only inside the insight gradient |

Rule: one accent. Blue marks "now". Pink and green only carry meaning.

## Type
- Inter (variable), `tabular-nums` on every number. Reason: the reference is a neutral grotesk, and tabular figures keep KPI numbers aligned.
- Page title "Overview": 40px, weight 400, tracking -0.02em.
- KPI hero number: 72px desktop / 56px phone, weight 400, tracking -0.04em, line-height 1.
- Insight card number: 48px weight 400 white, with a 12px caption to its right.
- Card title: 17px weight 500. Card meta under the title: 12px muted. Row labels 13px; row values 15px weight 500.
- Sentence case everywhere. No uppercase tracked labels. Sidebar group label "Analyze": 12px muted.
- Text is short. One meta line per card. Explanations belong in a tooltip, the insight card or the callout, not as paragraphs inside every row.

## Shape and elevation
- Radius: cards 20px, controls and nav items 10px, pill controls and delta pills 999px, icon circles 999px.
- Cards are flat: 1px `line` border, no shadow. Only popovers, menus and dialogs carry a shadow.
- Card padding 20px. Grid gap 12px. Page padding 24px (desktop), 16px (phone).

## Desktop layout (1280px and wider)
One screen, no page scroll for the core grid at 1440x900.

```
| sidebar 248px | Overview                       [date chip | vs ...] [scope] [export] |
|               | KPI card          | tall breakdown card | insight gradient card     |
|               | (row 1)           | (spans rows 1 and 2) | (row 1)                  |
|               | Last 12 weeks     |                     | Needs you                 |
|               | (row 2)           |                     | (row 2)                   |
```
- Three equal columns. Column 1 and column 3 each hold two cards; column 2 holds one card spanning both rows. Row 1 is about 55% of the height, row 2 about 45%.
- Anything beyond these five cards (the Admin per-salesperson table, recently added) goes below the grid, after a 24px gap, full width.
- 768 to 1279px: two columns (KPI + weekly | breakdown), insight and needs-you below in two columns.
- Phone (< 768px): one column in this order: KPI, Needs you, insight, Last 12 weeks, breakdown, extras. Top bar with logo and menu button; the sidebar becomes a drawer.

## Sidebar (exactly as the reference)
1. Top row: logo mark (28px rounded square) + "FSI CRM" wordmark 19px weight 500, and on the right a 32px square ghost button that collapses the sidebar to an icon rail (state remembered per browser).
2. Search field: `surface-raised` pill-ish input (radius 10, 40px tall) with a search icon, placeholder "Search", and a `⌘K` key hint at the right. It opens a command palette that searches leads and customers by name, phone or business; Enter opens `/customers/<id>`. `⌘K` / `Ctrl+K` opens it from anywhere.
3. Primary nav: 40px rows, 18px outline icons, 14px labels. Active item: `ink` background, white text, radius 10.
4. "Analyze" label, then the secondary nav.
5. Bottom group: "Notifications" with a count badge (orange `sun` circle, white number) showing chats waiting for this person; it opens `/inbox`. Settings and Help are not shown until those pages exist.
6. Divider, then the profile row: 36px avatar (photo or initials), name 14px weight 500, "Role · French Solar Industry" 12px muted (truncated), and a "…" button opening a menu with: Notifications on this device, Light or dark theme, Sign out.

## Page header controls (exactly as the reference)
- Right-aligned group, 40px tall pills, 8px apart.
- Date chip: a `canvas`-tinted pill containing a white `surface-raised` inner pill with a calendar icon, the range ("14 Oct to 12 Nov") and a chevron; after it, inside the outer pill, muted text "vs 14 Sep to 13 Oct" (only when the comparison period is real data; otherwise omit the "vs" text). Clicking opens a menu: Last 7 days, Last 30 days, Last 90 days.
- Scope pill (Admin only): icon + "Whole team" + chevron, opening a menu of salespeople.
- Export pill (download icon + "Export"): downloads a CSV of the leads behind the current view. Show it only when it works.
- These are buttons with menus, not native `<select>` boxes. Keyboard: Enter/Space opens, arrows move, Escape closes.

## Overview cards (look)
- **KPI card:** title + meta; a 36px circular "…" button top right (menu with real actions, or omit it). Hero number. A delta row: small white pill with a pink ▼ or green ▲ and the change, then muted "vs previous 30 days". One short sentence (13px). A hatched blue progress bar (12px tall, rounded) with a small scale label under its left end; a black target tick and "Target N" label only when a real target exists. Then 2 to 3 divider-separated rows: label left, value right, optional delta pill.
- **Breakdown card (tall, middle):** title + meta, and a text link with chevron top right. A horizontal waterfall: each row is a label (left) and a value (right) on one line, with its bar on the line below. The first bar is a full-width grey hatched total; each following bar is a pink hatched segment offset to where the previous one ended, joined by thin dashed vertical connectors; the last bar is a short solid blue result. An x-axis scale under the chart (5 ticks, 11px muted). At the bottom, a `surface-raised` inner callout (radius 12) with one bold sentence and one muted line, both computed from the data.
- **Insight card:** the gradient (navy top-left to `sun` bottom-right) with a soft light arc shape in the lower right; a translucent outline chip with an icon at top left and "1 of 3" at top right (pager arrows on hover/focus or below on phone); big number + caption; 19px white headline; muted white body; a white pill button with chevron at the bottom. One per screen.
- **Needs you:** title + meta ("4 things today"), "…" button. Rows: 32px tinted icon circle (pink, amber, blue, grey), title 13px weight 500, one detail line 12px muted, chevron. Dividers between rows. Each row opens the matching filtered list.
- **Last 12 weeks:** title left, muted meta right. Thin bars (about 60% of the slot width) with gaps, hatched blue; the current week solid blue with its value above it. Dates only under the first and last bar. A dashed target line with its label only when a real target exists. No per-bar numbers, no legend, no paragraph.

## Overview slot mapping (real FSI data only)
| Reference slot | FSI content |
|---|---|
| Gross margin KPI | Win rate: Deal / (Deal + No Deal) for leads decided in the period, with the all-time rate when the period has none decided (say which). Rows: Deals won (period, delta vs previous), New leads (period), Open pipeline (now). No target tick unless FSI supplies a target. |
| "Why it is under target" waterfall | "Where the pipeline stands": total leads with a status (grey hatched), then each open stage as a pink segment, ending with Deal as the solid blue bar; No deal shown as its own pink segment. Link "Leads" to `/leads`. Callout: the largest stage and its share. |
| Pattern found card | "Worth knowing": computed facts (existing insights). |
| Needs you | Follow-ups due, stuck leads, leads with a status but no date, leads with no status, chats waiting for a person. |
| Last 12 weeks | New leads per week since the import window ended (fewer than 12 bars is fine; say "Since 5 Oct"). |
| Below the grid | Admin: By salesperson table. Everyone: Recently added. |

## Motion
MOTION 1: hover and focus states only, 120ms color/background transitions. No entrance animations, no loops.

## Theme
Light by default for everyone, as in the reference, regardless of the device's dark setting. Dark is available from the profile menu and remembered per browser; it uses the same tokens and must work fully.
