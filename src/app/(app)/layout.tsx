import { Sidebar } from "@/components/shell/sidebar"
import { getProfile } from "@/lib/auth"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile()

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar user={{ name: profile.name, role: profile.role, photoUrl: profile.photoUrl }} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  )
}
