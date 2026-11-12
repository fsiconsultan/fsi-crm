import Link from "next/link"
import { redirect } from "next/navigation"
import { AddSalesperson } from "@/components/sales/sales-forms"
import { SalesTeamList } from "@/components/sales/sales-team-list"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { getProfile, isAdmin } from "@/lib/auth"
import { listSalesTeam } from "@/lib/data/sales-users"

export const metadata = { title: "Sales team" }

export default async function SalesPage() {
  const profile = await getProfile()
  if (!isAdmin(profile)) redirect("/")

  const team = await listSalesTeam()
  const members = team.ok ? team.members : []

  return (
    <>
      <PageHeader title="Sales team" actions={<AddSalesperson />} />

      <Card>
        {!team.ok ? (
          <ErrorState
            title="The sales team could not be loaded"
            detail={`The server answered: ${team.message}. Nothing was changed. Check your connection and load the page again.`}
            action={
              <Link href="/sales" className={buttonClass("secondary")}>
                Load again
              </Link>
            }
          />
        ) : members.length === 0 ? (
          <EmptyState
            title="Nobody is on the team yet"
            detail="Create the first login with Add salesperson. Each person then sees only the leads assigned to them."
          />
        ) : (
          <SalesTeamList members={members} currentUserId={profile.id} />
        )}
      </Card>
    </>
  )
}
