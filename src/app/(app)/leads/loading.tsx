import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function LeadsLoading() {
  return (
    <>
      <PageHeader title="Leads" />
      <Card className="max-md:p-4">
        <LoadingState label="Loading leads…" />
      </Card>
    </>
  )
}
