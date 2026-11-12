import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function CustomersLoading() {
  return (
    <>
      <PageHeader title="Customers" />
      <Card>
        <LoadingState label="Loading customers…" />
      </Card>
    </>
  )
}
