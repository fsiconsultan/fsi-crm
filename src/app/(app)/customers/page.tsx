import { PageHeader } from "@/components/shell/page-header"
import { RebuildNotice } from "@/components/shell/rebuild-notice"

export const metadata = { title: "Customers" }

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" />
      <RebuildNotice area="Customers" />
    </>
  )
}
