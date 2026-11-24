import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"
import { AI_CHAT_PAGE_META } from "@/lib/ai-chat/settings"

export default function AiChatLoading() {
  return (
    <>
      <PageHeader title="AI auto chat" meta={AI_CHAT_PAGE_META} />
      <Card>
        <LoadingState label="Reading the AI auto chat settings…" />
      </Card>
    </>
  )
}
