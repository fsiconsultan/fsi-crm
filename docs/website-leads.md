# Website leads

Every submission of the quote form and the chat widget on frenchsolarindustry.com
is filed in the CRM as a lead. The website keeps its own CSV copy and email; the
CRM call is extra and never blocks the visitor.

## Flow

1. `actions/action_SendForm.php` (website repo) saves the CSV row, then POSTs the
   request to `POST /api/webhooks/website-lead` with a 4 second timeout.
2. The route (`src/app/api/webhooks/website-lead/route.ts`) checks the signature,
   validates the payload and calls `public.ingest_website_lead` (security definer,
   executable by `service_role` only, like `wa_find_or_create_lead`), which in one
   transaction:
   - returns the same lead when the `submission_id` was seen before (retries are safe),
   - attaches the request to an existing lead that matches by phone (same rules as
     `phone_wa`, so `0812...`, `+62 812...` and `62812...` are one number) or by
     email (case-insensitive): a dated note is appended, `quote_details` is replaced
     by the newer quote (a chat keeps the old one), an empty phone or email is filled
     in. Status, owner and name are never changed. When several leads match, the
     most recently updated one is used and the note names the others,
   - otherwise creates a lead: status `New`, lead_type `Customer`, unassigned,
     `status_started_at` now, `source` `website_quote` or `website_chat`.
3. A meter photo (JPEG, PNG, WebP, HEIC, HEIF, at most 4 MB, type read from the
   bytes) is stored at `<lead id>/meter-photo-<submission id>.<ext>` in the
   `customer-documents` bucket with a `customer_documents` row of type
   `Meter Photo` and `uploaded_by` null (no person uploaded it). Larger photos stay
   on the website server and the note says so. Vercel refuses bodies over 4.5 MB.
4. The customer page shows the latest quote in a read-only "Website quote request"
   card: the monthly cost as the headline, the answers as rows, and an "Open in
   Google Maps" button only when the visitor shared their GPS position. The Notes
   card shows each website entry as its own block (newest first); the stored text
   is unchanged. Meter photos open in a viewer on the page; PDFs open in a tab.

## Contract

- Header `X-FSI-Signature: sha256=<hex>`: HMAC-SHA256 of the exact request body,
  keyed with `WEBSITE_LEAD_SECRET`. Compared in constant time.
- `application/json`: the payload. `multipart/form-data`: a `payload` field holding
  the JSON and an optional `photo` file.
- Payload fields: `submission_id` (16 to 64 of `A-Za-z0-9_-`), `form` (`quote` or
  `chat`), `language`, `first_name`, `last_name`, `phone`, `email`, `message`,
  `photo_skipped` (`too_large`), and for a quote `quote`: `site_type`,
  `site_type_other`, `installation_type`, `monthly_cost`, `monthly_cost_unit`
  (`Rp` or `kWh`), `reduction_percent`, `meter_phase`, `latitude`, `longitude`,
  `address`.
- Answers: 200 `{ ok, lead_id, created, replayed, photo }`, 400 invalid payload,
  401 bad signature, 413 too large, 500 database error, 503 not configured.

## Setup

1. Apply `supabase/migrations/20261126090000_website_leads.sql` (project owner).
   It needs `20261112090000_whatsapp.sql` applied first.
2. Generate the secret once: `openssl rand -hex 32`.
3. Vercel: add `WEBSITE_LEAD_SECRET` (and `SUPABASE_SECRET_KEY` if not set yet) to
   the environment that serves the CRM, then redeploy.
4. Website server: in `actions/config.local.php` set `crm_webhook_url` to
   `https://<crm host>/api/webhooks/website-lead` and `crm_webhook_secret` to the
   same secret. Empty values switch the CRM call off.

## Testing

`pnpm test` covers the signature, validation, idempotency and photo rules with an
in-memory store. The matching itself lives in SQL; check it against a local
database (`supabase start` in a scratch folder with these migrations), never
against production.
