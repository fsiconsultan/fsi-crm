"use client"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"

export default function SalesError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="Sales team" />
      <Card>
        <ErrorState
          title="The sales team could not be shown"
          detail="Something failed while loading the team. Nothing was changed. Try again in a moment."
          action={<Button onClick={() => retry()}>Try again</Button>}
        />
      </Card>
    </>
  )
}
