import { PageHeader } from "@/components/shell/page-header"
import { LoadingState } from "@/components/ui/states"

export default function ReviewLoading() {
  return (
    <>
      <PageHeader title="Needs review" />
      <LoadingState label="Loading items to review" />
    </>
  )
}
