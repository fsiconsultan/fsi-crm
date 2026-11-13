import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function CalendarLoading() {
  return (
    <>
      <PageHeader title="Calendar" />
      <Card className="max-md:p-4">
        <LoadingState label="Loading the calendar…" />
      </Card>
    </>
  )
}
