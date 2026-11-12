import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/states"

export default function CustomerLoading() {
  return (
    <Card>
      <LoadingState label="Loading customer profile…" />
    </Card>
  )
}
