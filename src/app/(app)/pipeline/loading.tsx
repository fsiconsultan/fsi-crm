import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function PipelineLoading() {
  return (
    <>
      <PageHeader title="Pipeline" />
      <Card className="max-md:p-4">
        <LoadingState label="Loading the pipeline…" />
      </Card>
    </>
  )
}
