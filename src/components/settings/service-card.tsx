"use client"

import { useState, useTransition, type ReactNode } from "react"
import { BellRing, CalendarDays, Database, Globe, Mail, MessageCircle, Reply, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { IconCircle, type Tint } from "@/components/ui/icon-circle"
import type { TestResult } from "@/lib/integrations/probe"
import { StatusPill, type ConnectionStatus } from "./status-pill"
import { TestResultView } from "./test-result"

export type CardId = "supabase" | "whatsapp" | "openai" | "push" | "calendar" | "email" | "website"

// Each glyph names what the service carries: the database, WhatsApp chats,
// the AI's replies, phone alerts, appointments, emails to leads, the website's forms.
const icons: Record<CardId, LucideIcon> = {
  supabase: Database,
  whatsapp: MessageCircle,
  openai: Reply,
  push: BellRing,
  calendar: CalendarDays,
  email: Mail,
  website: Globe,
}

// Same meanings as the Overview's icon circles: blue is working, pink is a failure, grey is not there yet.
const tints: Record<ConnectionStatus, Tint> = {
  connected: "blue",
  error: "pink",
  not_tested: "grey",
  not_set_up: "grey",
  not_built: "grey",
}

function statusAfter(result: TestResult, previous: ConnectionStatus): ConnectionStatus {
  if (result.state === "ok") return "connected"
  if (result.state === "error") return "error"
  if (result.state === "missing") return "not_set_up"
  return previous
}

export function ServiceCard({
  id,
  title,
  purpose,
  initialStatus,
  test,
  children,
}: {
  id: CardId
  title: string
  purpose: string
  initialStatus: ConnectionStatus
  test?: () => Promise<TestResult>
  children: ReactNode
}) {
  const [status, setStatus] = useState(initialStatus)
  const [result, setResult] = useState<TestResult | null>(null)
  const [pending, startTransition] = useTransition()
  const headingId = `settings-${id}`

  function runTest() {
    if (!test) return
    startTransition(async () => {
      try {
        const next = await test()
        setResult(next)
        setStatus((previous) => statusAfter(next, previous))
      } catch {
        setResult({
          state: "error",
          code: "request_failed",
          message: "The test could not reach the CRM server. Check your connection and try again.",
          ms: null,
        })
      }
    })
  }

  return (
    <Card as="article" className="flex min-w-0 flex-col gap-4">
      <header className="flex items-start gap-3">
        <IconCircle icon={icons[id]} tint={tints[status]} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 id={headingId} className="text-[17px] font-medium leading-6 text-ink">
              {title}
            </h2>
            <StatusPill status={status} />
          </div>
          <p className="mt-0.5 text-[13px] text-muted">{purpose}</p>
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-4">{children}</div>

      {test ? (
        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          <Button onClick={runTest} disabled={pending} aria-describedby={`${headingId}-result`} className="self-start">
            {pending ? "Testing…" : "Test connection"}
          </Button>
          <div id={`${headingId}-result`} role="status" aria-live="polite">
            {result ? <TestResultView result={result} /> : null}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
