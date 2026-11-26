"use client"

import { useEffect } from "react"
import { Button } from "./button"
import { Card } from "./card"
import { ErrorState } from "./states"

// Shared body for a segment's error.tsx.
export function RouteError({
  error,
  retry,
  title,
  detail,
}: {
  error: unknown
  retry: () => void
  title: string
  detail: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Card>
      <ErrorState
        title={title}
        detail={detail}
        action={
          <Button variant="secondary" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </Card>
  )
}
