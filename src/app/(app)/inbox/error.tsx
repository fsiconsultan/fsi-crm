"use client"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"

// Next 16.3+: the boundary receives `retry`, which re-fetches the segment.
export default function InboxError({ error, retry }: { error: unknown; retry: () => void }) {
  const detail = error instanceof Error && error.message ? error.message : "An unexpected error occurred."

  return (
    <>
      <PageHeader title="Inbox" />
      <Card>
        <ErrorState
          title="The inbox could not be loaded"
          detail={detail}
          action={<Button onClick={() => retry()}>Try again</Button>}
        />
      </Card>
    </>
  )
}
