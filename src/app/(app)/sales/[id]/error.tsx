"use client"

import { TeamBackLink } from "@/components/sales/person-view"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"

export default function SalesPersonError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <TeamBackLink />
      <Card className="max-md:p-4">
        <ErrorState
          title="This person's page could not be shown"
          detail="One of the counts failed to load, so no numbers are shown rather than partial ones. Nothing was changed. Try again in a moment."
          action={<Button onClick={() => retry()}>Try again</Button>}
        />
      </Card>
    </>
  )
}
