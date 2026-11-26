import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: { default: "FSI CRM", template: "%s · FSI CRM" },
  description: "Lead, customer and sales management for French Solar Industry.",
  // Home Screen install on iPhone (needed there for notifications).
  appleWebApp: { capable: true, title: "FSI CRM", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
}

// Lets pages pad for the iPhone home indicator with env(safe-area-inset-*).
// The inbox reply box relies on it.
export const viewport: Viewport = {
  viewportFit: "cover",
  // Browser chrome matches the light canvas token: light is the default whatever the
  // device setting. The theme switch rewrites it to the dark canvas when dark is chosen.
  themeColor: "#f2f2f0",
}

// Before paint: the dark theme only when chosen in the profile menu, and the
// collapsed sidebar rail, so neither flashes on load.
const themeScript = `try{var d=document.documentElement;if(localStorage.getItem("fsi-theme")==="dark")d.dataset.theme="dark";if(localStorage.getItem("fsi-sidebar")==="collapsed")d.dataset.sidebar="collapsed";if(d.dataset.theme==="dark")document.addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",getComputedStyle(d).getPropertyValue("--canvas").trim())})}catch(e){}`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
