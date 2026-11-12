import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/database.types"
import { supabaseEnv } from "@/lib/supabase/env"

const PUBLIC_PATHS = ["/login"]

// Refreshes the Supabase session cookie on every request and sends signed-out
// visitors to /login. Real authorization still happens in the data layer and RLS.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  if (user && isPublic) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    return NextResponse.redirect(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|sw\\.js|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
