import type { ReactNode } from "react"
import type { TestResult } from "@/lib/integrations/probe"

type Tone = "good" | "quiet" | "bad"

const boxTones: Record<Tone, string> = {
  good: "bg-positive-soft",
  quiet: "bg-surface-sunken",
  bad: "bg-negative-soft",
}

// The inner callout of the reference (radius 12), tinted by outcome.
function Box({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <div className={`rounded-[12px] px-4 py-3 ${boxTones[tone]}`}>{children}</div>
}

function Lines({ lines }: { lines: string[] }) {
  if (!lines.length) return null
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-ink">
      {lines.map((line) => (
        <li key={line} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  )
}

// The real outcome of one test, in words first; the tint only repeats it.
export function TestResultView({ result }: { result: TestResult }) {
  if (result.state === "ok") {
    return (
      <Box tone="good">
        <p className="text-[13px] font-medium text-ink">
          Connected<span className="font-normal text-ink tabular-nums">{result.ms > 0 ? `, answered in ${result.ms} ms` : ""}</span>
        </p>
        <Lines lines={result.lines} />
      </Box>
    )
  }

  if (result.state === "missing") {
    return (
      <Box tone="quiet">
        <p className="text-[13px] font-medium text-ink">Missing key</p>
        <p className="mt-1 text-[13px] text-ink">
          Not tested: <span className="break-all font-mono text-[12px]">{result.missing.join(", ")}</span>{" "}
          {result.missing.length === 1 ? "is" : "are"} not set. Nothing was sent.
        </p>
      </Box>
    )
  }

  if (result.state === "denied") {
    return (
      <Box tone="bad">
        <p className="text-[13px] font-medium text-ink">Only an Admin can run this test.</p>
      </Box>
    )
  }

  return (
    <Box tone="bad">
      <p className="text-[13px] font-medium text-ink">
        Error <span className="break-all font-mono text-[12px] font-normal">{result.code}</span>
        {result.ms !== null ? <span className="font-normal tabular-nums">, after {result.ms} ms</span> : null}
      </p>
      <p className="mt-1 break-words text-[13px] text-ink">{result.message}</p>
    </Box>
  )
}
