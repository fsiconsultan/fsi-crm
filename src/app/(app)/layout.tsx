import { Sidebar } from "@/components/shell/sidebar"
import { getProfile } from "@/lib/auth"
import { countWaitingChats } from "@/lib/whatsapp/inbox"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile()
  // The Notifications badge. Null (no badge) when the inbox is not set up or the count failed.
  const waiting = await countWaitingChats(profile.id)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar user={{ name: profile.name, role: profile.role, photoUrl: profile.photoUrl }} waiting={waiting} />
      <main id="main" className="min-w-0 flex-1 px-4 py-5 md:p-6 md:pl-3">
        {children}
      </main>
    </div>
  )
}
