import { redirect } from "next/navigation"
import { KnowledgeCard } from "@/components/ai-chat/knowledge-sources"
import { AutoChatCard, HandoverCard, PersonaCard } from "@/components/ai-chat/settings-forms"
import { TriggerRulesCard } from "@/components/ai-chat/trigger-rules"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"
import { AI_CHAT_PAGE_META } from "@/lib/ai-chat/settings"
import { canManageSettings, getProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "AI auto chat" }

function LoadError({ what, message }: { what: string; message: string }) {
  return (
    <Card>
      <ErrorState
        title={`${what} could not be loaded`}
        detail={`Nothing was changed. Reload the page to try again. (${message})`}
      />
    </Card>
  )
}

export default async function AiChatPage() {
  const profile = await getProfile()
  if (!canManageSettings(profile)) redirect("/")

  const supabase = await createClient()
  const [settings, rules, sources] = await Promise.all([
    supabase.from("ai_chat_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("ai_chat_trigger_rules")
      .select("id, name, trigger_description, target_status, enabled, auto_move, sort_order")
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("ai_knowledge_sources")
      .select("id, kind, title, body, file_path, file_name, mime_type, file_size, status, created_at")
      .order("created_at", { ascending: false }),
  ])

  const settingsError = settings.error?.message ?? (settings.data ? null : "the settings row is missing")

  return (
    <>
      <PageHeader title="AI auto chat" meta={AI_CHAT_PAGE_META} />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {settingsError || !settings.data ? (
            <LoadError what="The settings" message={settingsError ?? ""} />
          ) : (
            <>
              <AutoChatCard settings={settings.data} />
              <PersonaCard settings={settings.data} />
              <HandoverCard settings={settings.data} />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {rules.error ? (
            <LoadError what="The pipeline triggers" message={rules.error.message} />
          ) : (
            <TriggerRulesCard rules={rules.data ?? []} />
          )}
          {sources.error ? (
            <LoadError what="The knowledge sources" message={sources.error.message} />
          ) : (
            <KnowledgeCard sources={sources.data ?? []} />
          )}
        </div>
      </div>
    </>
  )
}
