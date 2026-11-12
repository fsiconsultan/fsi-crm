# WhatsApp and AI assistant (Phase C)

Incoming WhatsApp messages are stored, answered by an OpenAI assistant that
qualifies the lead, and shown in the inbox at `/inbox`, where staff can take
over. Everything is built and tested against recorded-shape payloads; it goes
live once the items under "What FSI must supply" exist.

## How it fits together

1. Meta calls `POST /api/webhooks/whatsapp`. The route checks the
   `X-Hub-Signature-256` HMAC on the raw body, stores the message (idempotent on
   Meta's message id), and returns 200.
2. After the response is sent, the agent (`src/lib/ai/`) answers the newest
   customer message, unless the conversation is in `human` mode.
3. The reply goes out through the Cloud API client
   (`src/lib/whatsapp/cloud-api.ts`) and is stored with its real outcome.
4. Staff work in `/inbox`: read threads, take over, reply, hand back, assign,
   and clear the review list at `/inbox/review`.

## Setup

1. **Database.** The owner reviews and applies
   `supabase/migrations/20261112090000_whatsapp.sql` to `crm-fsi`. Nobody else
   applies it. Mark the baseline as applied first
   (`supabase migration repair --status applied 20260917000000`), then
   `supabase db push`. The backfill in section 2 of the file can be run on its
   own; it fills `leads.phone_wa` and nothing else. Until the migration is
   applied, `/inbox` shows "not set up yet" and the webhook answers 500 so Meta
   retries.
2. **Types.** `src/lib/supabase/database.types.ts` is generated from the live
   project and includes the WhatsApp and push tables. Regenerate it after every
   migration: `supabase gen types typescript --project-id yoyszukutqwoxxdolzcg
   --schema public`.
3. **Meta.** In the Meta app for the WhatsApp Business account:
   - Callback URL: `https://<production host>/api/webhooks/whatsapp`
   - Verify token: the value of `WHATSAPP_VERIFY_TOKEN`
   - Subscribe the app to the `messages` webhook field.
4. **Environment variables** (Vercel, and `.env.local` for development):

| Name | What it is |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`). Used only by the webhook and agent. Server only. |
| `WHATSAPP_VERIFY_TOKEN` | Any long random string; must match the Meta app's verify token. |
| `WHATSAPP_APP_SECRET` | The Meta app secret; used to check webhook signatures. |
| `WHATSAPP_ACCESS_TOKEN` | System user access token with `whatsapp_business_messaging`. |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number id of FSI's WhatsApp number. |
| `WHATSAPP_GRAPH_VERSION` | Optional. Graph API version, default `v23.0`. Set it to the current version at go-live. |
| `WHATSAPP_REENGAGE_TEMPLATE` | Optional. Name of an approved template without variables, for writing to a customer after the 24-hour window. |
| `WHATSAPP_REENGAGE_TEMPLATE_LANG` | Optional. Its language code, default `id`. |
| `OPENAI_API_KEY` | OpenAI API key. |
| `OPENAI_MODEL` | Model name. Required; there is no default in code. |

What happens while something is missing:

| Missing | Behaviour |
|---|---|
| `WHATSAPP_APP_SECRET` | Every webhook POST is rejected with 401. |
| `SUPABASE_SECRET_KEY` or the tables | Webhook answers 503 or 500; Meta retries later. Nothing is lost silently. |
| `OPENAI_API_KEY` or `OPENAI_MODEL` | Messages are stored and appear in the inbox. No AI reply. One "AI not configured" item per conversation in the review list. |
| `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` | Replies (AI or staff) are stored as failed with "WhatsApp is not connected yet" and listed for review. |

## Tables

| Table | Purpose |
|---|---|
| `leads.phone_wa` (new column) | Digits-only form of `leads.phone` (`62812...`) for matching. Kept in step by a trigger; `phone` is never changed. |
| `wa_conversations` | One per customer number: linked lead, `mode` (`bot` or `human`), assignee, who took over and when, last customer message time (24-hour window), last read time. |
| `wa_messages` | Every message: direction, sender (`customer`, `bot`, `human`), body, Meta message id (unique), delivery status, error. |
| `wa_qualifications` | The answers the AI has collected, one jsonb document per conversation. |
| `automation_events` | Log of automated actions and failures. `needs_review` rows feed the review list. |
| `assignment_history` | Each assignment: from, to, rule, who did it. |

Row level security follows the baseline: an Admin sees everything; anyone else
sees a conversation only if it is assigned to them or linked to one of their
leads. Only the server (secret key) can create conversations, customer and bot
messages, and qualification answers.

## Rules (for FSI to approve)

These are the rules as built. Each lives in one file so it can be changed.

### Phone matching (`src/lib/phone.ts`, SQL `normalize_phone_wa`)

`0812...`, `812...`, `+62 812...`, `62812...`, `+62 0812...` all become
`62812...`. Other country codes are kept as written. When a field holds several
numbers, the first is used. A number shorter than 10 digits (11 for Indonesia)
or longer than 15 is treated as unusable.

- One lead has the number: the conversation is linked to it.
- No lead has it: the conversation stays unlinked until the AI's
  `find_or_create_lead` step creates a lead (status `New`, note "Created from a
  WhatsApp conversation").
- Several leads share it: nothing is linked or created. A "Duplicate phone
  match" item goes to the review list, where a person picks the right lead.

### Assignment (`src/lib/whatsapp/assignment.ts`)

- A conversation that matches an existing lead is assigned to that lead's
  salesperson (rule `lead_owner`), unless that salesperson is Inactive.
- Anything else is unassigned until an Admin assigns it in the inbox (rule
  `manual`). If its lead has no owner, the lead gets the same owner; a lead that
  already has an owner is not changed.
- No other rule (round robin, by area, by workload) exists. FSI has not supplied
  one.

### Automated status changes (`src/lib/ai/status-rules.ts`)

| Event | Change | Condition |
|---|---|---|
| AI creates a lead from WhatsApp | new lead starts at `New` | Only for leads the AI creates. |
| `qualification_completed` (all answers saved) | `New` to `First Contact` | Only if the automation set the current status. |

The automation records every status it writes and the exact time it wrote it
(server-written events only; staff cannot add these). Before changing a status
it checks that the lead still has that status and that `status_started_at` is
still that exact time. If not, a person set or changed it, and the change is
refused and listed for review as "Status change refused". This also catches a
person moving the lead away and back, and any save in the legacy app (which
writes `status_started_at` as a date). It cannot tell apart an edit that
changes neither field. Leads with no status are never given one. Unknown events and
database errors are listed as "Status change failed".

### Takeover

- "Take over" sets the conversation to `human` and records who and when. The AI
  does not reply while a conversation is in `human` mode, including to new
  customer messages. A reply the AI was still writing at the moment of takeover
  is dropped.
- "Hand back to AI" sets it to `bot`. Only this turns AI replies back on. Only
  the person who took over, or an Admin, can hand it back; when the AI asked
  for a person and nobody has taken over yet, anyone who can see it can.
- A takeover is always recorded under the name of the person who did it.
- The AI can ask for a person itself (customer asks for one, complains, or asks
  something out of scope). It sends one closing message, the conversation goes
  to `human` with nobody named, and a "Handoff requested" item is listed.
- Staff replies require takeover first, so the AI and a person never answer at
  the same time. Staff messages are stored with the sender, and are written by
  the server after it sends them, so a message can never be recorded as
  delivered when it was not.

### How the AI handles busy conversations

- One AI run per conversation at a time. A customer who sends "Halo" and then
  "mau pasang solar" two seconds later gets one answer to both: the second
  run sees the first is working and stops, and the first notices the new
  message before it sends and starts again with both in view.
- Right before sending, the run checks again that nobody took over. If someone
  did, nothing is sent. Once a person takes over, the AI stops before running
  any further step.
- Lead creation happens in one locked database step, so two runs can never
  create two leads for one conversation.
- Each model call has a time limit, and the whole run must finish within 50
  seconds (the webhook allows 60). A run that runs out of time is logged as an
  AI error. A run cut off by the platform is listed in the review list as "No
  reply yet" after 3 minutes.
- A message the server stored as "pending" but never heard back about from
  WhatsApp is shown as "Not confirmed, check WhatsApp".

### The 24-hour window

WhatsApp accepts free-form messages only within 24 hours of the customer's last
message. Outside it, a free-form reply is refused before it is sent and shown as
"Not sent" in the thread. Staff can send the approved template named in
`WHATSAPP_REENGAGE_TEMPLATE` instead, if one is configured.

### What the AI will not do

`calculate_indicative_system` and `book_site_visit` exist as tools but answer
"not configured" (`src/lib/ai/seams.ts`). The assistant is instructed to say a
representative will follow up, and never to state a price, system size, saving
or visit time that a tool did not give it. Implement the two functions in that
file when FSI's engineering rules, catalogue, pricing and calendar are ready.

## Review list event types

| Type | Meaning |
|---|---|
| `lead_match_ambiguous` | Several leads share the customer's number. |
| `status_change_refused` | An automated status change was blocked to protect a person's status. |
| `status_change_failed` | An automated status change hit an unknown event or an error. |
| `send_failed` | Meta rejected a message, or accepted it and failed to deliver it. |
| `handoff_requested` | The AI asked for a person. |
| `ai_not_configured`, `ai_error`, `tool_failed` | The AI could not answer or a step failed. |
| No reply yet (not an event) | A customer message the AI started on and never finished, after 3 minutes. Clears when the AI answers or someone takes over. |

Informational events (`lead_created`, `lead_linked`, `status_changed`,
`takeover`, `handback`, `reply_suppressed`, `unsupported_message`) are logged
but not listed for review.

## What FSI must supply

1. Approval to apply the migration, and the Supabase secret key in Vercel.
2. A Meta Business account with a WhatsApp Business number, the app secret, a
   system user access token and the phone number id.
3. An OpenAI API key and the model to use.
4. Approval of the rules above: status mapping, assignment, the qualification
   questions and the assistant's wording.
5. A re-engagement template approved by Meta (optional but needed to write to
   customers after 24 hours).
6. Engineering rules, catalogue and pricing for indicative calculations, and the
   Google Calendar details for site visits (later phases).

## Testing

`pnpm test` runs everything against an in-memory store and a scripted model; no
network or credentials are needed. Sample payloads are in
`src/lib/whatsapp/testing/fixtures/`. To exercise the webhook locally, sign a
fixture with the app secret:

```bash
BODY=$(cat src/lib/whatsapp/testing/fixtures/text-message.json)
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')
curl -X POST http://localhost:3210/api/webhooks/whatsapp \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$SIG" --data-binary "$BODY"
```
