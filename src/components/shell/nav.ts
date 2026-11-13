import { CalendarDays, Funnel, Kanban, LayoutGrid, MessagesSquare, Settings, UserCog, Users, type LucideIcon } from "lucide-react"
import type { Role } from "@/lib/auth"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  group: "main" | "analyze" | "bottom"
  roles?: Role[]
}

// One line per page. Add an item only once its page exists (antislop R-24).
// Icons: outline set chosen to match the reference's stroke weight; each glyph names the record it opens.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutGrid, group: "main" },
  { href: "/leads", label: "Leads", icon: Funnel, group: "main" },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, group: "main" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "main" },
  { href: "/inbox", label: "Inbox", icon: MessagesSquare, group: "main" },
  { href: "/customers", label: "Customers", icon: Users, group: "analyze" },
  { href: "/sales", label: "Sales team", icon: UserCog, group: "analyze", roles: ["Admin"] },
  { href: "/settings", label: "Settings", icon: Settings, group: "bottom", roles: ["Admin"] },
]

export function navFor(role: Role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
