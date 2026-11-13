import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function SettingsLoading() {
  return (
    <>
      <PageHeader title="Settings" meta="Admin only. The CRM's connections to outside services." />
      <Card>
        <LoadingState label="Reading the connection details…" />
      </Card>
    </>
  )
}
