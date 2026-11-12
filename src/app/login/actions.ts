"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type LoginState = { error: string | null; username: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!username || !password) {
    return { error: "Enter your username and password.", username }
  }

  const supabase = await createClient()

  // Accounts sign in with a username; Supabase Auth needs the email behind it.
  const { data: email, error: lookupError } = await supabase.rpc("get_login_email", {
    p_username: username,
  })

  if (lookupError) {
    return { error: "Could not reach the server. Try again in a moment.", username }
  }

  if (!email) {
    return { error: "Username or password is incorrect.", username }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Username or password is incorrect.", username }
  }

  redirect("/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
