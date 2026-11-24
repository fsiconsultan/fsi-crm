"use client"

import { PageHeader } from "@/components/shell/page-header"
import { RouteError } from "@/components/ui/route-error"

export default function AiChatError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="AI auto chat" />
      <RouteError
        error={error}
        retry={retry}
        title="The AI auto chat settings could not be loaded"
        detail="Nothing was changed. Check your connection and try again."
      />
    </>
  )
}
