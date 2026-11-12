import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type Role = "Admin" | "Sales" | "Digital Marketing" | "Secretary"

export type Profile = {
  id: string
  authUserId: string
  name: string
  username: string
  role: Role
  photoUrl: string | null
}

// Every page and action reads the signed-in profile through here. RLS still
// decides which rows come back; this only shapes the UI.
export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data } = await supabase
    .from("sales_users")
    .select("id, name, username, role, status, photo_url, avatar_url")
    .eq("auth_user-id", user.id)
    .maybeSingle()

  if (!data || data.status === "Inactive") redirect("/login?error=no-profile")

  return {
    id: data.id,
    authUserId: user.id,
    name: data.name ?? data.username ?? "Unnamed user",
    username: data.username ?? "",
    role: (data.role ?? "Sales") as Role,
    photoUrl: data.photo_url ?? data.avatar_url,
  }
})

export function isAdmin(profile: Profile) {
  return profile.role === "Admin"
}
