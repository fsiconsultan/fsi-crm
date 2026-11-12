"use client"

import { useEffect } from "react"
import { markRead } from "@/app/(app)/inbox/actions"

// Rendered only while the open thread is unread. A new customer message changes
// lastInboundAt, which marks the thread read again while it stays open.
export function MarkRead({ conversationId, lastInboundAt }: { conversationId: string; lastInboundAt: string | null }) {
  useEffect(() => {
    void markRead(conversationId)
  }, [conversationId, lastInboundAt])

  return null
}
