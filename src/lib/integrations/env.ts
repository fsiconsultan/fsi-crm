import "server-only"

// Which environment variables each outside service reads, and what the
// Settings page may show about them. Nothing in this file returns a variable's
// value except the few non-secret identifiers in `identifiersFor`, each picked
// by hand. Everything else is reduced to "set" or "missing".

export type Env = Readonly<Record<string, string | undefined>>

export type ServiceId = "supabase" | "whatsapp" | "openai" | "push" | "calendar" | "email"

export const SERVICE_IDS: readonly ServiceId[] = ["supabase", "whatsapp", "openai", "push", "calendar", "email"]

export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === "string" && (SERVICE_IDS as readonly string[]).includes(value)
}

type EnvSpec = { required: readonly string[]; optional: readonly string[] }

export const SERVICE_ENV: Record<ServiceId, EnvSpec> = {
  supabase: {
    required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    // Only the WhatsApp webhook, the AI agent and notifications use it.
    optional: ["SUPABASE_SECRET_KEY"],
  },
  whatsapp: {
    required: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"],
    optional: ["WHATSAPP_GRAPH_VERSION", "WHATSAPP_REENGAGE_TEMPLATE", "WHATSAPP_REENGAGE_TEMPLATE_LANG"],
  },
  openai: { required: ["OPENAI_API_KEY", "OPENAI_MODEL"], optional: [] },
  push: { required: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"], optional: [] },
  calendar: { required: ["GOOGLE_CALENDAR_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"], optional: [] },
  email: { required: ["RESEND_API_KEY", "EMAIL_FROM"], optional: ["EMAIL_REPLY_TO"] },
}

export type EnvVarStatus = { name: string; set: boolean; required: boolean }

function isSet(env: Env, name: string) {
  return (env[name] ?? "").trim() !== ""
}

export function envStatus(service: ServiceId, env: Env = process.env): EnvVarStatus[] {
  const { required, optional } = SERVICE_ENV[service]
  return [
    ...required.map((name) => ({ name, set: isSet(env, name), required: true })),
    ...optional.map((name) => ({ name, set: isSet(env, name), required: false })),
  ]
}

export function missingOf(names: readonly string[], env: Env = process.env): string[] {
  return names.filter((name) => !isSet(env, name))
}

export function missingRequired(service: ServiceId, env: Env = process.env): string[] {
  return missingOf(SERVICE_ENV[service].required, env)
}

export const DEFAULT_GRAPH_VERSION = "v23.0"

export type Identifier = { label: string; value: string }

// "https://abcd.supabase.co" -> "abcd". The project ref is in .env.example and
// every browser request, so it is not a secret.
export function supabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return host.endsWith(".supabase.co") ? host.split(".")[0] : host
  } catch {
    return null
  }
}

export function lastDigits(value: string | undefined, count = 4): string | null {
  const trimmed = (value ?? "").trim()
  if (trimmed.length <= count) return null
  return `ending ${trimmed.slice(-count)}`
}

// The only values the page shows. Each one is public or a short suffix.
export function identifiersFor(service: ServiceId, env: Env = process.env): Identifier[] {
  const list: Array<Identifier | null> = []
  switch (service) {
    case "supabase": {
      const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)
      list.push(ref ? { label: "Project", value: ref } : null)
      break
    }
    case "whatsapp": {
      const phone = lastDigits(env.WHATSAPP_PHONE_NUMBER_ID)
      list.push(phone ? { label: "Phone number id", value: phone } : null)
      const version = (env.WHATSAPP_GRAPH_VERSION ?? "").trim()
      list.push({ label: "Graph version", value: version || `${DEFAULT_GRAPH_VERSION} (default)` })
      break
    }
    case "openai": {
      const model = (env.OPENAI_MODEL ?? "").trim()
      list.push(model ? { label: "Model", value: model } : null)
      break
    }
    case "email": {
      // Sender and reply-to addresses are what the lead sees; not secrets.
      const from = (env.EMAIL_FROM ?? "").trim()
      list.push(from ? { label: "Sender", value: from } : null)
      const replyTo = (env.EMAIL_REPLY_TO ?? "").trim()
      list.push(replyTo ? { label: "Replies go to", value: replyTo } : null)
      break
    }
    case "push":
    case "calendar":
      break
  }
  return list.filter((item): item is Identifier => item !== null)
}

// Provider error text can echo a key back ("Incorrect API key provided:
// sk-ab***yz"). Everything a provider says passes through here first.
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_*.-]{6,}/g, // OpenAI keys, masked or not
  /sb_secret_[A-Za-z0-9_-]+/g, // Supabase secret keys
  /\bEAA[A-Za-z0-9]{10,}/g, // Meta access tokens
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, // JWTs
  /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, // PEM keys
  /\bre_[A-Za-z0-9_]{8,}/g, // Resend API keys
]

export function redactSecrets(text: string, env: Env = process.env): string {
  let out = text
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, "[hidden]")
  // Any configured secret value, whatever its shape.
  for (const name of SECRET_NAMES) {
    const value = (env[name] ?? "").trim()
    if (value.length >= 8) out = out.split(value).join("[hidden]")
  }
  return out
}

export const SECRET_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "OPENAI_API_KEY",
  "VAPID_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "RESEND_API_KEY",
] as const
