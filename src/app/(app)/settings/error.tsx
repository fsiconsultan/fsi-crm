"use client"

import { PageHeader } from "@/components/shell/page-header"
import { RouteError } from "@/components/ui/route-error"

export default function SettingsError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <PageHeader title="Settings" />
      <RouteError
        error={error}
        retry={retry}
        title="Settings could not be loaded"
        detail="The connection details could not be read, and nothing was changed. Check your connection and try again."
      />
    </>
  )
}
