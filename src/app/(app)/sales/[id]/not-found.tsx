import Link from "next/link"
import { TeamBackLink } from "@/components/sales/person-view"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { pillClass } from "@/components/ui/pill"
import { EmptyState } from "@/components/ui/states"

export default function SalesPersonNotFound() {
  return (
    <>
      <TeamBackLink />
      <PageHeader title="Person not found" />
      <Card className="max-md:p-4">
        <EmptyState
          title="Nobody on the team has this link"
          detail="The link may be mistyped, or it was copied from somewhere else. Open the person from the team list instead."
          action={
            <Link href="/sales" className={pillClass("tinted")}>
              Back to the team
            </Link>
          }
        />
      </Card>
    </>
  )
}
