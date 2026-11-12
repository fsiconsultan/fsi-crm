# FSI CRM design direction

Source: the dashboard reference the project owner supplied on 2026-11-12 ("Overview" screen: soft grey canvas, white rounded cards, near-black active nav item, hatched bar fills, one gradient insight card, a "Needs you" list). The owner asked for the CRM to follow it exactly, so this file transcribes it. Brand assets: `public/logo-fsi.jpg`.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Identity
- Product: internal CRM for French Solar Industry (Bali). Users: admin, sales, digital marketing, secretary. Daily use on desktop, quick checks on phone.
- Personality: calm, numeric, honest. Numbers are the hero; chrome stays quiet.
- Identity motif: diagonal hatching inside bars and progress fills (`.hatch`). Solid fill marks "the current period"; hatching marks history and targets. Use it consistently, never as decoration.

## Palette (tokens in `src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | #f2f2f0 | #121212 | App background and sidebar |
| `surface` | #ffffff | #1b1b1b | Cards |
| `line` | #e6e6e3 | #2c2c2c | Card borders, dividers |
| `ink` | #141414 | #f1f1ef | Text, active nav background |
| `muted` | #636363 | #a3a3a3 | Secondary text (AA on surface and canvas) |
| `accent` | #2457e6 | #7d9bff | The one accent: current-period bars, primary actions, focus ring |
| `negative` | #c42a5f | #ff7aa6 | Losses, overdue, failures |
| `positive` | #17803d | #5fd18b | Gains |
| `sun` | #f0a35e | #f0a35e | Only inside the insight gradient (sky to sun, a solar nod) |

Rule: one accent. Blue marks "now" and the main action. Pink and green only carry meaning (down/up, failed/ok).

## Type
- Inter (variable). Reason: the reference is set in a neutral grotesk, and Inter's tabular figures keep KPI numbers aligned.
- Page title: 40px, weight 400, tight tracking. KPI hero number: 64 to 72px, weight 300, `tabular-nums`. Card titles: 17px, weight 500. Body 14px. Meta 12 to 13px muted.
- No uppercase tracking labels; section labels in the sidebar are 12px muted sentence case ("Analyze").

## Shape and elevation
- Radius: cards 20px, controls 10px, chips 999px only for compact status chips and the delta pill.
- Cards are flat: 1px `line` border, no shadow. The only shadow is on popovers and dialogs (they float above the page).
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Card padding 20 to 24px, grid gap 16px.

## Layout
- Desktop: fixed 248px sidebar on `canvas` (logo, search, primary nav, "Analyze" group, bottom: notifications, settings, help, profile), content on `canvas` with cards on `surface`.
- Page header: large title on the left, filters on the right as white pill-ish controls (date range, scope select, export).
- Dashboard grid: 3 columns on wide screens, varied card heights driven by content (not a uniform bento).
- Mobile (< 768px): sidebar becomes a top bar with a menu button and a slide-over drawer; cards stack in one column; header filters wrap below the title.

## Components seen in the reference
- KPI card: title, period meta, hero number, delta pill (down = negative tint, up = positive tint), one-line explanation, hatched progress bar with target marker, key-value rows.
- Waterfall / breakdown chart with hatched negative bars and a solid final bar.
- Weekly bar chart: hatched history bars, solid current bar, dashed target line.
- Insight card: gradient sky (navy) to sun (orange), a "1 of 3" pager, white text, one white action button. One per screen at most.
- "Needs you" list: tinted circular icon, title, one-line detail, chevron. Each row opens the records it describes.

## Motion
MOTION 1: hover and focus states only, 120ms color/background transitions. No entrance animations, no loops.

## Theme
Light by default (office daytime use, matches the reference). A working dark theme is provided through the same tokens and a toggle in the sidebar.
