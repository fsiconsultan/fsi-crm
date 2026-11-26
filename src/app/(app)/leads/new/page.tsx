import { PageHeader } from "@/components/shell/page-header"
import { getProfile, isAdmin } from "@/lib/auth"
import { listSalesUsers } from "@/lib/data/leads"
import { LeadFormCard, safeBack } from "../lead-form-page"

export const metadata = { title: "Add lead" }

export default async function NewLeadPage({ searchParams }: PageProps<"/leads/new">) {
  const { back } = await searchParams
  const profile = await getProfile()
  const salesUsers = isAdmin(profile) ? await listSalesUsers() : null

  return (
    <>
      <PageHeader title="Add lead" />
      <LeadFormCard lead={null} salesUsers={salesUsers} back={safeBack(back)} />
    </>
  )
}
