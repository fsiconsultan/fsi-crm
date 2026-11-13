"use client"

import { BackLink } from "@/components/customers/back-link"
import { PageHeader } from "@/components/shell/page-header"
import { RouteError } from "@/components/ui/route-error"

export default function CustomerError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <BackLink />
      <PageHeader title="Customer" />
      <RouteError
        error={error}
        retry={retry}
        title="This customer could not be shown"
        detail="Something failed while loading the profile. Nothing was changed. Try again, and if it keeps failing, tell the admin which customer you were opening."
      />
    </>
  )
}
