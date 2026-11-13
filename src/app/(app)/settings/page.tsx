import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CopyField } from "@/components/settings/copy-field"
import { DetailList, EnvList, Note, type Detail } from "@/components/settings/details"
import { ServiceCard } from "@/components/settings/service-card"
import type { ConnectionStatus } from "@/components/settings/status-pill"
import { formatDateTime } from "@/components/inbox/format"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { getProfile, isAdmin } from "@/lib/auth"
import { loadSettingsActivity, type Fact, type LastEvent } from "@/lib/integrations/activity"
import { envStatus, identifiersFor, missingRequired, type ServiceId } from "@/lib/integrations/env"
import {
  testCalendarConnection,
  testEmailConnection,
  testOpenAiConnection,
  testPushConnection,
  testSupabaseConnection,
  testWhatsAppConnection,
} from "./actions"

export const metadata = { title: "Settings" }

function configured(service: ServiceId): ConnectionStatus {
  return missingRequired(service).length ? "not_set_up" : "not_tested"
}

function factValue<T>(fact: Fact<T>, show: (value: T) => string): string {
  if (fact.state === "not_set_up") return "Table not set up yet"
  if (fact.state === "error") return `Could not read (${fact.message})`
  return show(fact.value)
}

const whenOrNone = (at: string | null) => (at ? formatDateTime(at) : "None yet")
const eventOrNone = (event: LastEvent) => (event ? `${formatDateTime(event.at)}: ${event.summary}` : "None")
const count = (value: number) => value.toLocaleString("en-US")

async function siteOrigin() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost"
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https")
  return `${proto}://${host}`
}

export default async function SettingsPage() {
  const profile = await getProfile()
  if (!isAdmin(profile)) redirect("/")

  const [activity, origin] = await Promise.all([loadSettingsActivity(), siteOrigin()])

  const supabaseRead = activity.leads.state === "ready" && activity.staff.state === "ready"
  const supabaseStatus: ConnectionStatus = supabaseRead ? "connected" : "error"

  const supabaseDetails: Detail[] = [
    ...identifiersFor("supabase"),
    { label: "Leads", value: factValue(activity.leads, count) },
    { label: "Staff logins", value: factValue(activity.staff, count) },
  ]

  const whatsappDetails: Detail[] = [
    ...identifiersFor("whatsapp"),
    { label: "Last message received", value: factValue(activity.lastInbound, whenOrNone) },
    { label: "Last webhook problem", value: factValue(activity.lastWebhookProblem, eventOrNone) },
  ]

  const openAiDetails: Detail[] = [
    ...identifiersFor("openai"),
    { label: "Last AI reply", value: factValue(activity.lastAiReply, whenOrNone) },
    { label: "Last AI problem", value: factValue(activity.lastAiProblem, eventOrNone) },
  ]

  const pushDetails: Detail[] = [
    {
      label: "Registered devices",
      value: factValue(activity.devices, ({ count: n, scope }) =>
        scope === "everyone" ? `${count(n)}, all staff` : `${count(n)} of yours (the secret key is needed to count everyone's)`,
      ),
    },
  ]

  const calendarDetails: Detail[] = [
    { label: "Last event synced", value: factValue(activity.lastCalendarSync, whenOrNone) },
    { label: "Last sync problem", value: factValue(activity.lastCalendarError, eventOrNone) },
  ]

  const emailDetails: Detail[] = [
    ...identifiersFor("email"),
    { label: "Last email sent", value: factValue(activity.lastEmailSent, whenOrNone) },
    { label: "Last email problem", value: factValue(activity.lastEmailError, eventOrNone) },
  ]

  return (
    <>
      <PageHeader title="Settings" meta="Admin only. The CRM's connections to outside services." />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ServiceCard
          id="supabase"
          title="Supabase"
          purpose="The database and file storage behind every lead, login and document."
          initialStatus={supabaseStatus}
          test={testSupabaseConnection}
        >
          <EnvList items={envStatus("supabase")} />
          <DetailList title="Details" items={supabaseDetails} />
          {!supabaseRead && <Note>The page&apos;s own read failed. Press Test connection to see the error.</Note>}
        </ServiceCard>

        <ServiceCard
          id="whatsapp"
          title="WhatsApp Business"
          purpose="Receives customer messages from Meta's Cloud API and sends replies."
          initialStatus={configured("whatsapp")}
          test={testWhatsAppConnection}
        >
          <EnvList items={envStatus("whatsapp")} />
          <CopyField title="Webhook URL to paste into the Meta app" value={`${origin}/api/webhooks/whatsapp`} />
          <DetailList title="Details" items={whatsappDetails} />
        </ServiceCard>

        <ServiceCard
          id="openai"
          title="OpenAI"
          purpose="Writes the AI's WhatsApp replies and collects the lead's answers."
          initialStatus={configured("openai")}
          test={testOpenAiConnection}
        >
          <EnvList items={envStatus("openai")} />
          <DetailList title="Details" items={openAiDetails} />
        </ServiceCard>

        <ServiceCard
          id="push"
          title="Phone notifications"
          purpose="Web Push alerts on staff phones when a chat needs a person."
          initialStatus={configured("push")}
          test={testPushConnection}
        >
          <EnvList items={envStatus("push")} />
          <DetailList title="Details" items={pushDetails} />
          <Note>The test only checks the keys. It does not send a notification.</Note>
        </ServiceCard>

        <ServiceCard
          id="calendar"
          title="Google Calendar"
          purpose="Puts every appointment, site survey, call and follow-up on FSI's calendar."
          initialStatus={configured("calendar")}
          test={testCalendarConnection}
        >
          <EnvList items={envStatus("calendar")} />
          <DetailList title="Details" items={calendarDetails} />
          <Note>
            Share the calendar with the service account&apos;s email address and choose &quot;Make changes to
            events&quot;. The test only reads the calendar; the first schedule shows whether the CRM can write to it.
          </Note>
        </ServiceCard>

        <ServiceCard
          id="email"
          title="Email to leads"
          purpose="Emails the lead a calendar file when a schedule is made, moved or cancelled."
          initialStatus={configured("email")}
          test={testEmailConnection}
        >
          <EnvList items={envStatus("email")} />
          <DetailList title="Details" items={emailDetails} />
          <Note>The test checks the Resend key and that the sender&apos;s domain is verified. It does not send an email.</Note>
        </ServiceCard>

        <ServiceCard
          id="website"
          title="Website lead capture"
          purpose="Will turn website forms and the solar calculator into leads in this CRM."
          initialStatus="not_built"
        >
          <Note>
            Each form sent on the FSI website, and each solar calculator result, will create a lead here or update the
            existing one with the same phone number. Nothing receives them yet. Building it needs access to the FSI
            website.
          </Note>
        </ServiceCard>
      </div>

      <Card as="section" className="mt-3">
        <h2 className="text-[17px] font-medium leading-6 text-ink">How to set these</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] text-ink">
          <li>Open the CRM project on Vercel, then Settings, then Environment Variables.</li>
          <li>Add or change the variable by the exact name shown above.</li>
          <li>Redeploy. A new value takes effect only after the next deployment.</li>
          <li>Never paste a key into the CRM, a chat or an email. This page only says whether each one is set.</li>
        </ol>
      </Card>
    </>
  )
}
