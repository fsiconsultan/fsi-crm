import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shell/page-header"
import { RebuildNotice } from "@/components/shell/rebuild-notice"
import { getProfile, isAdmin } from "@/lib/auth"

export const metadata = { title: "Sales team" }

export default async function SalesPage() {
  const profile = await getProfile()
  if (!isAdmin(profile)) redirect("/")

  return (
    <>
      <PageHeader title="Sales team" />
      <RebuildNotice area="Sales team" />
    </>
  )
}
