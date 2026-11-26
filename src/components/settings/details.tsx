import type { ReactNode } from "react"
import { Check, X } from "lucide-react"
import type { EnvVarStatus } from "@/lib/integrations/env"

type KeyState = "set" | "missing" | "optional"

const keyTone: Record<KeyState, string> = {
  set: "text-ink",
  missing: "text-negative",
  optional: "text-muted",
}

const keyLabel: Record<KeyState, string> = {
  set: "Set",
  missing: "Missing",
  optional: "Not set (optional)",
}

function stateOf(item: EnvVarStatus): KeyState {
  if (item.set) return "set"
  return item.required ? "missing" : "optional"
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-xs text-muted">{title}</h3>
      {children}
    </section>
  )
}

// Names only, never values. Names are in a mono face because staff copy them
// letter for letter into Vercel.
export function EnvList({ items }: { items: EnvVarStatus[] }) {
  return (
    <Group title="Environment variables">
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const state = stateOf(item)
          const Icon = item.set ? Check : X
          return (
            <li key={item.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-1.5">
              <code className="min-w-0 break-all font-mono text-[12px] text-ink">{item.name}</code>
              <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${keyTone[state]}`}>
                <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
                {keyLabel[state]}
              </span>
            </li>
          )
        })}
      </ul>
    </Group>
  )
}

export type Detail = { label: string; value: ReactNode }

export function DetailList({ title, items }: { title: string; items: Detail[] }) {
  if (!items.length) return null
  return (
    <Group title={title}>
      <dl className="divide-y divide-line">
        {items.map((item) => (
          <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
            <dt className="text-[13px] text-muted">{item.label}</dt>
            <dd className="min-w-0 break-words text-right text-[13px] font-medium tabular-nums text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Group>
  )
}

// A short note under the details: one plain sentence.
export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>
}
