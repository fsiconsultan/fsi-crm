import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

// Same frame as the page: header, the quick-view group and filter bar as quiet
// placeholders of their real height, then the list card.
export default function LeadsLoading() {
  return (
    <>
      <PageHeader title="Leads" meta="Counting leads…" />
      <div aria-hidden="true" className="mb-3 flex flex-col gap-3">
        <div className="h-[52px] w-full max-w-3xl rounded-full bg-line/50 md:h-10" />
        <div className="h-11 w-full max-w-xl rounded-full bg-line/50 md:h-10" />
      </div>
      <Card className="max-md:border-0 max-md:bg-transparent max-md:p-0">
        <LoadingState label="Loading leads…" />
      </Card>
    </>
  )
}
