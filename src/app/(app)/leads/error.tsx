"use client"

import { PageHeader } from "@/components/shell/page-header"
import { RouteError } from "@/components/ui/route-error"

export default function LeadsError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="Leads" />
      <RouteError
        error={error}
        retry={retry}
        title="Leads could not be loaded"
        detail="The database did not answer, so no leads are shown and nothing was changed. Check your connection and try again. If it keeps failing, tell the admin."
      />
    </>
  )
}
