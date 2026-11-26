# Client schedules

Each lead or customer can have appointments, site surveys, calls and
follow-ups. Staff create, move, cancel and complete them in the CRM. Each one
is saved first, then copied into the old CRM's date column on the lead, put on
FSI's Google Calendar, and (if asked) emailed to the lead with a calendar file.
Every step reports what really happened; a failed step never shows as done.

## Time zones

FSI works across Indonesia, so every schedule keeps its customer's own zone
(`lead_schedules.time_zone`, `src/lib/schedules/zones.ts`):

| IANA zone | Label | Offset | Where |
| --- | --- | --- | --- |
| `Asia/Jakarta` | WIB | UTC+7 | Java, Banten, DKI Jakarta, Sumatra, West and Central Kalimantan |
| `Asia/Makassar` | WITA | UTC+8 | Bali, NTB (Lombok, Gili, Mandalika), NTT (Komodo, Labuan Bajo), Sulawesi, South, East and North Kalimantan |
| `Asia/Jayapura` | WIT | UTC+9 | Maluku, Papua (Sorong, Raja Ampat, Jayapura, Merauke, Timika) |

Rules:

1. **Stored in UTC.** `starts_at`/`ends_at` are UTC; `time_zone` says in which
   zone the day and times were given. None of the three zones has daylight
   saving.
2. **Default zone.** A new booking without `timeZone` gets
   `zoneForLocation(lead.location).zone`. Nothing recognised (empty, "-",
   "zen villa") gives `Asia/Makassar` (FSI is in Bali). Staff may override
   it. A reschedule keeps the booking's zone unless a new one is given.
3. **Location matching.** `zoneForLocation(text)` matches whole place names
   (provinces, cities, islands, common typos such as "makasar", "lembogan"),
   ignoring case and punctuation. Places in one zone: `confident: true`.
   Places in several zones ("jakarta, bali"): the first place's zone,
   `confident: false`. Nothing recognised: `Asia/Makassar`, `confident: false`.
4. **"Today or later"** is checked in the booking's zone.
5. **What the customer sees** (email, WhatsApp, Google event) is the booking's
   local time with its label: "10:00 WIB". The `.ics` file keeps UTC times,
   which every calendar shows correctly; all-day dates are the local day.
6. **What staff see.** Staff views group and order by the office day in Bali
   (WITA): `ScheduleView.officeDay`, `officeStartTime`, `officeEndTime`. Each
   item also carries its own `timeZone`, `zoneLabel` and local `day`,
   `startTime`, `endTime`. Both sets are equal for WITA bookings. An all-day
   item stays on its own day for staff too.
7. **Old CRM date columns** get the booking's local day (the date the
   customer was given).
8. **Overlaps** (assistant availability, Google FreeBusy) are compared in UTC,
   so a WIB and a WITA booking for the same salesperson never double up.

Until migration `20261117090000` is applied: WITA bookings work as before
(the column is not sent), bookings in WIB or WIT fail with "need the time zone
migration", and the assistant's tools answer "not set up".

## API contract for the UI

All functions run as the signed-in user, so RLS decides what they see and change.

### Server actions (`src/lib/schedules/actions.ts`, `"use server"`)

| Function | Input | Result |
| --- | --- | --- |
| `createSchedule(input)` | `CreateScheduleInput` | `Promise<ScheduleActionResult>` |
| `rescheduleSchedule(input)` | `RescheduleScheduleInput` | `Promise<ScheduleActionResult>` |
| `cancelSchedule(input)` | `ScheduleRefInput` | `Promise<ScheduleActionResult>` |
| `markScheduleDone(input)` | `ScheduleRefInput` | `Promise<ScheduleActionResult>` |
| `confirmSchedule(input)` in `src/lib/schedules/confirm-action.ts` | `ScheduleRefInput` | `Promise<ScheduleActionResult>` |

`confirmSchedule` confirms a booking the WhatsApp assistant made (show it when
`schedule.needsConfirmation` is true). It only records who confirmed and when:
no calendar change, no email. It returns `ok: false` for staff items, for an
item already confirmed, for a stale `loadedUpdatedAt` (`stale: true`), and
until migration `20261116090000` is applied.

Types live in `src/lib/schedules/types.ts`, zones in `src/lib/schedules/zones.ts`
(both safe to import in client components):

```ts
type TimeZoneId = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura"
type ZoneLabel = "WIB" | "WITA" | "WIT"
type ScheduleKind = "appointment" | "site_survey" | "call" | "follow_up"

type CreateScheduleInput = {
  leadId: number
  kind: ScheduleKind
  title?: string           // default "<Kind>: <customer name>"
  date: string             // local day YYYY-MM-DD in timeZone, today or later there
  startTime?: string       // "HH:MM" in timeZone, required unless allDay
  endTime?: string         // "HH:MM" in timeZone, after startTime; default +1 hour; never for follow_up
  allDay?: boolean
  timeZone?: TimeZoneId    // default: zoneForLocation(lead.location).zone, else Asia/Makassar
  location?: string        // max 300
  notes?: string           // max 2000, internal, never emailed
  salesId?: string | null  // Admin only; default the lead's salesperson. Others: always themselves
  notifyLead?: boolean     // email the lead with an .ics file
}
type RescheduleScheduleInput = {
  scheduleId: string; loadedUpdatedAt: string
  date: string; startTime?: string; endTime?: string; allDay?: boolean   // in timeZone
  timeZone?: TimeZoneId    // default: the booking's current zone
  notifyLead?: boolean     // default: the schedule's current notifyLead
}
type ScheduleRefInput = { scheduleId: string; loadedUpdatedAt: string }

type ScheduleActionResult =
  | { ok: true; message: string; schedule: ScheduleView; steps: ScheduleSteps; recordError?: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<ScheduleField, string>>; stale?: boolean }

type ScheduleSteps = {
  legacy: { status: "updated" | "cleared" | "unchanged" | "kept_manual" | "failed" | "skipped"
            column: "appointment" | "site_survey" | "follow_up_date" | null; value: string | null; message: string }
  google: { status: "synced" | "removed" | "not_connected" | "failed" | "skipped"; message: string }
  email:  { status: "sent" | "not_requested" | "no_address" | "not_connected" | "failed"; message: string }
}
```

- `ok: false` means nothing was saved. Show `message`, and `fieldErrors` next to
  the fields (`leadId`, `kind`, `title`, `date`, `startTime`, `endTime`,
  `timeZone`, `location`, `notes`, `salesId`, `notifyLead`, `scheduleId`). `stale: true`:
  someone changed it since it was loaded; reload and let the user try again.
- `ok: true` means the schedule is saved. `message` is one plain sentence per
  step. A step can still have failed (`steps.google.status === "failed"`, for
  example); show it as a warning, not as success. `recordError` means an
  outcome could not be written to the row (rare); show it too.
- Always pass the latest `schedule.updatedAt` as `loadedUpdatedAt` for the next change.
- Only `scheduled` items can be moved, cancelled or marked done.

`ScheduleView` (one schedule):

```ts
{
  id, leadId, salesId, kind, title,
  startsAt, endsAt,              // UTC ISO; endsAt null for follow-ups
  allDay,
  timeZone, zoneLabel,           // the booking's zone: "Asia/Jakarta" and "WIB", ...
  day,                           // local YYYY-MM-DD in timeZone
  startTime, endTime,            // "HH:MM" in timeZone or null
  officeDay,                     // Bali (WITA) YYYY-MM-DD: group staff views by this
  officeStartTime, officeEndTime,// "HH:MM" WITA or null
  location, notes,
  status: "scheduled" | "done" | "cancelled",
  previousStartsAt, rescheduleCount, notifyLead,
  google: { status: "not_connected" | "pending" | "synced" | "failed", error, syncedAt },
  email:  { status: "not_requested" | "not_connected" | "sent" | "failed", error, sentAt, to },
  bookedBy: "ai" | "staff",      // "ai": booked by the WhatsApp assistant
  confirmedAt, confirmedBy,      // staff confirmation of an AI booking, else null
  needsConfirmation: boolean,    // bookedBy "ai", not confirmed, still scheduled: "Booked by AI, to confirm"
  createdBy, updatedBy, createdAt, updatedAt
}
```

Labels: `SCHEDULE_KIND_LABEL` in `types.ts`. Zones (`zones.ts`): `TIME_ZONES`
(per zone `short`, `long`, `longId`, `utc`, `offset`), `TIME_ZONE_IDS` (west
to east, for a picker), `OFFICE_TIME_ZONE`, `DEFAULT_TIME_ZONE`, `isTimeZone`,
`zoneLabel(zone)`, `zoneDescription(zone)` ("WIB (Western Indonesia Time,
UTC+7)") and `zoneForLocation(text)` (to preselect the picker). Formatting
(`time.ts`): `toUtc(day, time, zone)`, `localDay(iso, zone)`,
`localTime(iso, zone)`, `timeWithZone(start, end, zone)` ("10:00 to 11:00
WIB"), and `whenEnglish` / `whenIndonesian` / `whenShort(when, zone)`.

Always write a local time with its label ("10:00 WIB"). Where a staff view
shows office time for a booking in another zone, show both, for example
"11:00 WITA (10:00 WIB for the customer)".

### Loaders (`src/lib/data/schedules.ts`, server components only)

| Function | Returns |
| --- | --- |
| `getLeadSchedules(leadId)` | `{ setUp, upcoming, overdue, past }`: `upcoming` scheduled from the start of today's office (WITA) day, soonest first; `overdue` still scheduled but before that (offer Done or Cancel); `past` done or cancelled, latest first, max 50 |
| `listSchedulesInRange({ from, to, salesId?, statuses? })` | `{ setUp, items: ScheduleView[] }` whose `officeDay` is `from` to `to` inclusive, soonest first; default only `scheduled` |
| `getScheduleById(id)` | `ScheduleView \| null` |

`setUp: false` means the migration is not applied yet: show "Schedules are not
set up yet" rather than an error. Other failures throw (use the error state).

### Overview Schedule card

`getSchedule(salesId)` in `src/lib/data/schedule.ts` now merges `lead_schedules`
items into `days`, grouped by their office (WITA) day. Items from the table
carry `scheduleId`, `startTime` (WITA), `title` and `kind` on `ScheduleItem`,
plus `timeZone`, `zoneLabel`, `localDay` and `localStartTime` (the booking's
own zone); a `call` uses the appointment `type`. Column dates that only mirror
a schedule are dropped (same lead, same type, same local day), so nothing
shows twice.

## Database

Migration `supabase/migrations/20261114090000_lead_schedules.sql` (add-only):

- Table `lead_schedules`, times in UTC. Indexes on `(lead_id, starts_at)`,
  `(sales_id, starts_at)` and `(starts_at) where status = 'scheduled'`.
- RLS: Admin selects, inserts and updates everything. Others only rows on a
  lead assigned to them whose `sales_id` is themselves or empty, and insert
  only with `created_by` themselves. Nobody may delete (no grant): cancel
  instead. Nothing for `anon`.
- `lead_id ... on delete set null`: a schedule never blocks deleting a lead. A
  trigger then cancels the orphaned row so it leaves every calendar view. The
  CRM's delete action cancels the lead's schedules and removes their Google
  events first; if a lead is deleted elsewhere (the old CRM) and had a Google
  event, the row is marked `failed` with "remove this event by hand".
- New insert policy on `automation_events` for `schedule_google_failed` and
  `schedule_email_failed`, under the user's own name, for a lead they may see.
  These rows have `needs_review = true`.

Migration `supabase/migrations/20261117090000_schedule_time_zone.sql` (add-only):

- Nullable column `time_zone text default 'Asia/Makassar'` with a check
  limited to `Asia/Jakarta`, `Asia/Makassar` and `Asia/Jayapura`, and a column
  comment. Null reads as `Asia/Makassar`. No backfill (no rows when written).

Migration `supabase/migrations/20261116090000_schedule_ai_booking.sql` (add-only):

- Nullable columns `booked_via` (`whatsapp_ai` or null), `confirmed_at` and
  `confirmed_by` (`sales_users.id`, on delete set null), a check on
  `booked_via`, and a partial index for unconfirmed AI bookings.
- `created_by` is not reused as the marker: it is also null after a
  salesperson row is deleted, and it cannot hold a confirmation.
- Existing rows stay null: staff items, which never need confirming.
- RLS is unchanged: whoever may update a row may confirm it.
- Until it is applied, the assistant's scheduling tools answer "not set up"
  (their readiness check selects the new columns) and staff schedules work as before.

## Old CRM date columns

The old CRM shows one date per lead. After every change the matching column
is updated for that one lead: appointment and call use `appointment`, site
survey uses `site_survey`, follow-up uses `follow_up_date`.

1. A date typed by hand (no schedule of that type falls on it) that is today or
   later is never overwritten or cleared. Both still show on the Overview.
2. Otherwise the column is set to the soonest upcoming scheduled day of that type.
3. When nothing of that type is scheduled any more, a date the CRM wrote is
   cleared if its schedule was cancelled and kept if it was done.

There is no backfill: only the lead being scheduled is ever written.

## Environment variables

| Name | What it is |
| --- | --- |
| `GOOGLE_CALENDAR_ID` | The calendar's id (Google Calendar, Settings and sharing, Integrate calendar) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The service account's JSON key file, whole, on one line |
| `RESEND_API_KEY` | Resend API key (`re_...`) with sending access |
| `EMAIL_FROM` | Sender, on a domain verified in Resend, e.g. `French Solar Industry <crm@your-domain>` |
| `EMAIL_REPLY_TO` | Optional. Where replies go; also the organizer in the calendar file |

All are server-only. Locally none are set and everything still works: the
schedule is saved, and Google and email are reported as "not connected".

## Setting up Google Calendar

1. In Google Cloud, create a project (or use FSI's), enable the Google Calendar
   API, create a service account, and create a JSON key for it.
2. In Google Calendar, open the calendar FSI wants schedules on, Settings and
   sharing, "Share with specific people", add the service account's email
   (`...@...iam.gserviceaccount.com`) with **Make changes to events**.
3. Put the calendar id in `GOOGLE_CALENDAR_ID` and the key file in
   `GOOGLE_SERVICE_ACCOUNT_JSON` on Vercel, then redeploy.
4. Settings, Google Calendar, Test connection reads the calendar's name. The
   first schedule proves write access; its result shows on the same card.

Events have no attendees: a service account cannot invite people unless FSI has
Google Workspace with domain-wide delegation. The lead gets the CRM's own email
instead. Each event id is derived from the schedule id, so a retry never
creates a second event.

## Setting up email (Resend)

1. Create a Resend account and add FSI's domain (or a subdomain such as
   `mail.<fsi domain>`). Add the DNS records Resend shows and wait until the
   domain is **Verified**.
2. Create an API key with sending access and set `RESEND_API_KEY`,
   `EMAIL_FROM` and, if wanted, `EMAIL_REPLY_TO`. Redeploy.
3. Settings, Email to leads, Test connection lists the account's domains to
   confirm the key and the sender's domain. It never sends an email.

The email is short, in English then Indonesian: what, when (the customer's local time with its label, e.g. "10:00 WIB"), where, with
which salesperson, and how to contact FSI, plus an `.ics` file. New and moved
items use `METHOD:REQUEST`; a cancellation uses `METHOD:CANCEL` with the same
UID and a higher `SEQUENCE`, and is only sent to a lead who got the invitation.
Notes are never emailed.

## When something is missing or fails

| Situation | Saved | Google | Email |
| --- | --- | --- | --- |
| No Google keys | yes | `not_connected` | as below |
| Google refuses or times out | yes | `failed` + reason, review event | as below |
| `notifyLead` false | yes | as above | `not_requested` |
| Lead has no valid email | yes | as above | `failed` with "no valid email address", no send |
| No Resend keys | yes | as above | `not_connected` |
| Resend refuses or times out | yes | as above | `failed` + reason, review event |

Review events appear in `automation_events` with `needs_review`, alongside the
WhatsApp ones.

## WhatsApp assistant

The assistant can offer free times and book, move or cancel its own bookings
in the chat (contract 2.3). Owner approved booking on 2026-11-13; the rules
below are waiting for FSI's confirmation.

### Tools

| Tool | What it does |
| --- | --- |
| `check_availability({ kind, date, preferred_time? })` | Up to 3 free slots on that local day and the following days, in the customer's zone, for the customer's salesperson. `needs_location` when the zone is unclear. |
| `book_schedule({ kind, date, start_time, location?, notes? })` | Re-checks the slot, then books it in the customer's zone through `createScheduleCore`. `needs_location` when the zone is unclear. |
| `reschedule_my_booking({ new_date, new_start_time, kind? })` | Moves this lead's upcoming booking made by the assistant, in the booking's own zone. |
| `cancel_my_booking({ kind? })` | Cancels this lead's upcoming booking made by the assistant. |

Code: tools in `src/lib/ai/scheduling.ts`; the service in
`src/lib/schedules/ai-scheduler.ts` (wired in `ai-booking.ts`, Google busy
times in `free-busy.ts`); slot rules in `src/lib/schedules/availability.ts`.

### Rules (for FSI to confirm)

All of these are in one constant, `AI_SCHEDULING` in
`src/lib/schedules/availability.ts`, plus `AI_BOOKABLE_KINDS` next to it:

| Rule | As built |
| --- | --- |
| Kinds the assistant may book | `site_survey`, `appointment` (office or online), `call`. Never `follow_up`. |
| Working days and hours | Monday to Saturday, 09:00 to 17:00 in the **customer's local time**. A booking must end by 17:00. A Jakarta customer can book 16:00 WIB, which is 17:00 in Bali; a Papua customer's 09:00 WIT is 08:00 in Bali. |
| Customer's zone | The `location` the customer gave in this chat (qualification answer), else `leads.location`, via `zoneForLocation`. Not confident: `needs_location`, and the assistant asks for the city. `leads.location` is never written from the chat. |
| Minimum notice | 4 hours from now. Nothing in the past. |
| Furthest ahead | 60 days. |
| Lengths | Site survey 2 hours, appointment 1 hour, call 30 minutes. |
| Offered start times | On the hour; the search covers 7 calendar days from the asked date; 3 slots at most. |
| Salesperson | The existing assignment rule (`src/lib/whatsapp/assignment.ts`: the lead's active owner), else the conversation's active assignee. Nobody: the chat is handed to a person. |
| Busy | That salesperson's `scheduled` appointments, site surveys and calls (follow-ups block nothing; an all-day item blocks the day), plus every busy time on the shared Google Calendar except the CRM's own events. |

Google busy times come from the FreeBusy API (read-only, `GOOGLE_CALENDAR_ID`).
The shared calendar has no owner per event, so any non-CRM event there blocks
the slot for every salesperson. A FreeBusy block that exactly matches a CRM
item is skipped (that item is already counted for its own salesperson); a block
Google merged with something else is kept, so the check can only err towards
"busy". If Google is connected but cannot be read, no times are offered, the
failure is logged for review and the chat goes to a person.

### What a booking looks like

- `booked_via = 'whatsapp_ai'`, `created_by` null, `confirmed_at` null: shown
  as "Booked by AI, to confirm" (`ScheduleView.needsConfirmation`).
- `notify_lead` false: the lead is never emailed. The assistant tells the
  customer in WhatsApp, says a representative will confirm it, and never calls
  it confirmed.
- Legacy date column, Google Calendar sync and failure logging run exactly as
  for staff items.
- Moving it (by the assistant) clears `confirmed_at` again.
- One upcoming booking per kind per lead: the assistant moves the existing one
  instead of booking a second.

### Guards

- Only bookings on the conversation's own lead, made by the assistant, can be
  moved or cancelled in the chat. A booking made by staff is handed to a person.
- The slot is re-checked inside `book_schedule` and `reschedule_my_booking`
  against the database and Google. Two bookings in the same second can still
  both pass; staff see both on the calendar.
- A takeover stops the run before any tool runs, and every scheduling tool
  re-reads the conversation and refuses (`taken_over`) once a person has it.
- Without `SUPABASE_SECRET_KEY`, the table, or the new columns, every tool
  answers "not set up" and the assistant takes the preferred time down for a
  representative.

### Notifications and log

- Push to the booking's salesperson (Admins when they are Inactive), sent after
  the customer's reply: "AI booked a site survey: Tue 17 Nov, 10:00 to 12:00
  WITA. Please confirm.", "AI moved ...", "Customer cancelled ...", always in
  the booking's own zone ("10:00 to 12:00 WIB"). Opens the customer's page.
- `automation_events`: `schedule_ai_booked`, `schedule_ai_rescheduled`,
  `schedule_ai_cancelled` (informational) and `schedule_ai_check_failed`
  (review list).
