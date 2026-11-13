import { TeamBackLink } from "@/components/sales/person-view"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function SalesPersonLoading() {
  return (
    <>
      <TeamBackLink />
      <Card className="max-md:p-4">
        <LoadingState label="Loading this person's work…" />
      </Card>
    </>
  )
}
