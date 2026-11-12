import Link from "next/link"
import { InboxNotSetUp } from "@/components/inbox/not-set-up"
import { ReviewList } from "@/components/inbox/review-list"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/states"
import { getProfile } from "@/lib/auth"
import { loadReview, type ReviewEvent, type Loaded } from "@/lib/whatsapp/inbox"

function ReviewBody({ review }: { review: Loaded<ReviewEvent[]> }) {
  if (review.state === "not_set_up") return <InboxNotSetUp />
  if (review.state === "error") {
    return (
      <Card>
        <ErrorState
          title="The review list could not be loaded"
          detail={review.message}
          action={
            <Link href="/inbox/review" className={buttonClass()}>
              Try again
            </Link>
          }
        />
      </Card>
    )
  }
  return (
    <Card>
      <ReviewList events={review.data} />
    </Card>
  )
}

export const metadata = { title: "Needs review" }

export default async function ReviewPage() {
  await getProfile()
  const review = await loadReview()

  return (
    <>
      <PageHeader
        title="Needs review"
        actions={
          <Link href="/inbox" className={buttonClass("secondary")}>
            Back to inbox
          </Link>
        }
      />
      <ReviewBody review={review} />
    </>
  )
}
