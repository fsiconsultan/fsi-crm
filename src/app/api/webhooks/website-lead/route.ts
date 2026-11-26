import { createAdminClient } from "@/lib/whatsapp/admin-client"
import { handleWebsiteLead, MAX_BODY_BYTES, SIGNATURE_HEADER } from "@/lib/website-lead/handler"
import { createSupabaseWebsiteLeadStore } from "@/lib/website-lead/store"

// Called by actions/action_SendForm.php on frenchsolarindustry.com after each
// quote form or chat widget submission. proxy.ts skips /api/webhooks: the
// website is not a signed-in user. The HMAC signature over the raw body, keyed
// with WEBSITE_LEAD_SECRET, is what authenticates the caller. See
// docs/website-leads.md.

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (declared > MAX_BODY_BYTES) return Response.json({ ok: false, error: "Body too large" }, { status: 413 })

  const body = new Uint8Array(await request.arrayBuffer())
  const admin = createAdminClient()

  const { status, body: result } = await handleWebsiteLead({
    body,
    contentType: request.headers.get("content-type"),
    signature: request.headers.get(SIGNATURE_HEADER),
    secret: process.env.WEBSITE_LEAD_SECRET,
    store: admin ? createSupabaseWebsiteLeadStore(admin) : null,
    now: new Date(),
  })

  return Response.json(result, { status })
}
