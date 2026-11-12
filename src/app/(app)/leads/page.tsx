import { PageHeader } from "@/components/shell/page-header"
import { RebuildNotice } from "@/components/shell/rebuild-notice"

export const metadata = { title: "Leads" }

export default function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" />
      <RebuildNotice area="Leads" />
    </>
  )
}
