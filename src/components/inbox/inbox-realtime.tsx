"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const DEBOUNCE_MS = 300

// Re-renders the server page when a message or conversation changes. Renders nothing.
export function InboxRealtime() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined

    // One webhook delivery writes several rows; refresh once for the burst.
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS)
    }

    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, refresh)
      .subscribe()

    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
