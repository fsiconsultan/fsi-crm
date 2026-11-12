"use client"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"

export default function CustomersError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="Customers" />
      <Card>
        <ErrorState
          title="This page could not be shown"
          detail="Something failed while loading customer data. Nothing was changed. Try again, and if it keeps failing, tell the admin what you were opening."
          action={<Button onClick={() => retry()}>Try again</Button>}
        />
      </Card>
    </>
  )
}
