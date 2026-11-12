import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function SalesLoading() {
  return (
    <>
      <PageHeader title="Sales team" />
      <Card>
        <LoadingState label="Loading the sales team…" />
      </Card>
    </>
  )
}
