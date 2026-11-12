import Link from "next/link"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"

export default function CustomerNotFound() {
  return (
    <>
      <PageHeader title="Customer not found" />
      <Card>
        <EmptyState
          title="There is no customer here for you"
          detail="Either this customer does not exist, or it is assigned to someone else and you are not allowed to see it. Check the link, or ask an Admin to assign the customer to you."
          action={
            <Link href="/customers" className={buttonClass("secondary")}>
              Back to customers
            </Link>
          }
        />
      </Card>
    </>
  )
}
