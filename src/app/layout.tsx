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
  // Browser and installed-app chrome match the canvas token in each theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
}

// Applies the saved theme before paint so there is no light flash in dark mode.
const themeScript = `try{var t=localStorage.getItem("fsi-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`

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
