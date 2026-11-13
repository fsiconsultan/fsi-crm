import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"

// Honest placeholder for a page whose rebuild is in progress (antislop R-26, R-38).
// TODO: each phase session replaces its page and deletes its use of this component.
export function RebuildNotice({ area }: { area: string }) {
  return (
    <Card>
      <EmptyState
        title={`${area} is being rebuilt`}
        detail={`This screen is part of the new FSI CRM and is not finished yet. Keep using the current CRM for ${area.toLowerCase()} until it is.`}
      />
    </Card>
  )
}
