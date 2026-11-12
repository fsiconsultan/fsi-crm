import type { NextConfig } from "next"

// Cache Components stay off: every CRM page reads per-user data through RLS,
// so nothing is shared between users and pages render per request.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
