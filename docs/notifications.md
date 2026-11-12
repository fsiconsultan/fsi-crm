# Phone notifications

Staff get a notification on their phone (or desktop browser) when a WhatsApp
conversation needs them. Tapping it opens `/inbox/<conversation id>`.

## When a notification is sent

| Event | Who is notified |
|---|---|
| The AI asks for a person (`request_human_handoff`) | The assigned salesperson. If nobody is assigned, every active Admin. |
| A conversation is assigned or reassigned | The new assignee. This covers an Admin assigning in the inbox and the automatic `lead_owner` rule. |

The person who performed the action is never notified, and neither is anyone
whose account is Inactive. The notification shows the customer's WhatsApp name
(or number) and a fixed line ("Needs a person to take over." or "This
conversation was assigned to you."), never the AI's reason or any message,
because lock screens are public.

A failed notification never blocks the handoff, the assignment or the AI's reply
to the customer: each send times out after 5 seconds, all of a person's devices
are sent to at once, and the webhook answers the customer before notifying
staff. Devices the
push service reports as gone (HTTP 404 or 410) are removed. Other failures are
counted on the device and logged as `push_failed` in `automation_events`; when
nobody could be reached the event is listed in `/inbox/review`.

Code: `src/lib/push/` (`notify.ts` has the rules), hooks in
`src/lib/ai/tools.ts`, `src/app/api/webhooks/whatsapp/route.ts` and
`src/app/(app)/inbox/actions.ts`.

## Setup

1. The owner applies `supabase/migrations/20261112100000_push_subscriptions.sql`
   (after the Phase C WhatsApp migration). It adds `push_subscriptions` and the
   `register_push_subscription` function. Users see and remove only their own
   devices; the server sends with the secret key.
2. Generate VAPID keys once: `pnpm exec web-push generate-vapid-keys`. Keep the
   private key out of the repo.
3. Set in Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (a `mailto:` or `https:` contact for the push services), plus
   `SUPABASE_SECRET_KEY` from Phase C. Redeploy: the public key is built into
   the page. Until all three are set, the sidebar shows no notifications control
   and nothing is sent.

## Turning it on (each person, each device)

In the sidebar (on a phone: the menu), tap **Turn on notifications**. The
browser asks for permission only after that tap. The control shows the real
state: on, off, blocked in the browser settings, or not supported. "On" means
the server has this device saved for the signed-in user, not only that the
browser is subscribed.

Signing out removes this device's notifications, so the next person on a shared
phone never sees the previous user's. Only the browsers' own push services are
accepted as devices (Google, Mozilla, Apple, Microsoft).

**iPhone and iPad:** Apple only delivers web notifications to sites added to
the Home Screen (iOS 16.4 or later). Open the CRM in Safari, tap Share, then
**Add to Home Screen**, open FSI CRM from the Home Screen, sign in, and turn
notifications on there. The control explains this when it is opened in Safari.

**Android and desktop Chrome, Edge, Firefox:** works in the browser; installing
is optional.

## The app shell

- `src/app/manifest.ts`: name "FSI CRM", opens at `/inbox`, standalone.
- `public/sw.js`: handles `push` and `notificationclick` only. It caches
  nothing, so no CRM data is stored offline.
- Icons in `public/icons/` are **temporary**: the solar panel mark cropped from
  `public/logo-fsi.jpg` onto a square. Replace them with a square icon from FSI
  (512x512 PNG, plus 192x192 and a 180x180 `apple-touch-icon.png`).
- `src/proxy.ts` lets `/sw.js`, `/manifest.webmanifest` and `/icons/` load
  without a session, because the browser fetches them in the background.
