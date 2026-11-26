import type { MetadataRoute } from "next"

// Lets staff add the CRM to the Home Screen. On iPhone that is required before
// the browser will deliver notifications. Icons are temporary (the panel mark
// from public/logo-fsi.jpg) until FSI supplies a square app icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FSI CRM",
    short_name: "FSI CRM",
    description: "Lead, customer and sales management for French Solar Industry.",
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f0",
    theme_color: "#f2f2f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
