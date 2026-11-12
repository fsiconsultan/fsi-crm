import { PageHeader } from "@/components/shell/page-header"
import { RebuildNotice } from "@/components/shell/rebuild-notice"

export const metadata = { title: "Overview" }

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" />
      <RebuildNotice area="The dashboard" />
    </>
  )
}
