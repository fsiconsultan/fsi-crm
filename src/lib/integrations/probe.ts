import "server-only"

// What a "Test connection" press returns to the browser. Only plain text and
// numbers: never a key, a token or a raw provider response.
export type TestResult =
  | { state: "ok"; ms: number; lines: string[] }
  | { state: "missing"; missing: string[] }
  | { state: "error"; code: string; message: string; ms: number | null }
  | { state: "denied" }

export const TEST_TIMEOUT_MS = 8000

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type Probe =
  | { kind: "response"; ms: number; status: number; body: unknown }
  | { kind: "timeout"; ms: number }
  | { kind: "network"; ms: number }

// One read-only request with a hard timeout. Never throws.
export async function probe(
  fetchFn: FetchLike,
  url: string,
  init: RequestInit = {},
  timeoutMs = TEST_TIMEOUT_MS,
  clock: () => number = Date.now,
): Promise<Probe> {
  const started = clock()
  let response: Response
  try {
    response = await fetchFn(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    const ms = clock() - started
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
    return timedOut ? { kind: "timeout", ms } : { kind: "network", ms }
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { kind: "response", ms: clock() - started, status: response.status, body }
}

export function timeoutResult(provider: string, ms: number): TestResult {
  return {
    state: "error",
    code: "timeout",
    message: `${provider} did not answer within ${TEST_TIMEOUT_MS / 1000} seconds. Try again; if it keeps happening, check the provider's status page.`,
    ms,
  }
}

export function networkResult(provider: string, ms: number): TestResult {
  return {
    state: "error",
    code: "network",
    message: `Could not reach ${provider} from the server. Check the server's internet connection and try again.`,
    ms,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

// Reads `body.error` as { code, type, message } where each part may be missing.
export function errorFields(body: unknown): { code: string | null; type: string | null; message: string | null } {
  const error = isRecord(body) && isRecord(body.error) ? body.error : null
  const pick = (key: string) => {
    const value = error?.[key]
    return typeof value === "string" || typeof value === "number" ? String(value) : null
  }
  return { code: pick("code"), type: pick("type"), message: pick("message") }
}

export function stringField(body: unknown, key: string): string | null {
  if (!isRecord(body)) return null
  const value = body[key]
  return typeof value === "string" ? value : null
}
