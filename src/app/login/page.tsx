import Image from "next/image"
import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in" }

const ERRORS: Record<string, string> = {
  "no-profile":
    "Your login works, but it is not linked to an active FSI team member. Ask an admin to check your account.",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams
  const initialError = typeof error === "string" ? (ERRORS[error] ?? null) : null

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-6 md:p-8">
        <div className="mb-8 flex items-center gap-2.5">
          <Image src="/logo-fsi.jpg" alt="" width={46} height={24} className="h-6 w-auto rounded-[4px]" priority />
          <span className="text-[19px] font-medium tracking-tight">FSI CRM</span>
        </div>
        <h1 className="mb-1 text-2xl font-normal tracking-tight">Sign in</h1>
        <p className="mb-6 text-sm text-muted">Use the same username and password as the current CRM.</p>
        <LoginForm initialError={initialError} />
      </div>
    </main>
  )
}
