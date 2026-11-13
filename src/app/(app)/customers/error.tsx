"use client"

import { PageHeader } from "@/components/shell/page-header"
import { RouteError } from "@/components/ui/route-error"

export default function CustomersError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="Customers" />
      <RouteError
        error={error}
        retry={retry}
        title="This page could not be shown"
        detail="Something failed while loading customer data. Nothing was changed. Try again, and if it keeps failing, tell the admin what you were opening."
      />
    </>
  )
}
