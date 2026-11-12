import { PageHeader } from "@/components/shell/page-header"
import { LoadingState } from "@/components/ui/states"

export default function InboxLoading() {
  return (
    <>
      <PageHeader title="Inbox" />
      <LoadingState label="Loading conversations" />
    </>
  )
}
