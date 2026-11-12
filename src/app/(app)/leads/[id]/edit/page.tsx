import Link from "next/link"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { getLead, listSalesUsers } from "@/lib/data/leads"
import { LeadFormCard, safeBack } from "../../lead-form-page"

export const metadata = { title: "Edit lead" }

export default async function EditLeadPage({ params, searchParams }: PageProps<"/leads/[id]/edit">) {
  const [{ id }, { back }] = await Promise.all([params, searchParams])
  const profile = await getProfile()
  const leadId = /^\d+$/.test(id) ? Number(id) : null
  const [lead, salesUsers] = await Promise.all([
    leadId ? getLead(leadId) : null,
    isAdmin(profile) ? listSalesUsers() : null,
  ])
  const backHref = safeBack(back)

  return (
    <>
      <PageHeader title="Edit lead" />
      {lead ? (
        <LeadFormCard lead={lead} salesUsers={salesUsers} back={backHref} />
      ) : (
        <Card className="max-w-4xl max-md:p-4">
          <EmptyState
            title="This lead cannot be opened"
            detail="It was deleted, or it is assigned to someone else and you do not have access to it. Go back to the list to pick another lead."
            action={
              <Link href={backHref} className={buttonClass("secondary")}>
                Back to leads
              </Link>
            }
          />
        </Card>
      )}
    </>
  )
}
