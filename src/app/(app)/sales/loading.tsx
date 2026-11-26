import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function SalesLoading() {
  return (
    <>
      <PageHeader title="Sales team" meta="Counting each person's leads…" />
      <Card className="max-md:p-4">
        <LoadingState label="Loading the team and their numbers…" />
      </Card>
    </>
  )
}
