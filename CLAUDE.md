# FSI CRM (Next.js rebuild)

Rebuild of the French Solar Industry CRM on the existing Supabase project `crm-fsi` (`yoyszukutqwoxxdolzcg`). The old static app lives in `legacy/` for reference and still runs in production from `main`.

@AGENTS.md

## Hard rules
1. **Never delete or rewrite existing data.** No `drop`, `truncate`, `delete`, column renames or type changes on `leads`, `sales_users`, `customer_documents`, auth users or storage objects. Schema changes are add-only (new tables, new nullable columns).
2. **Never apply a migration to the live database yourself.** Write it to `supabase/migrations/`, open the PR, and ask the project owner. Reads (`select`) against the live project are fine.
3. **No secrets in the repo.** Server-only keys go in `.env.local` and Vercel env vars; list new names in `.env.example`.
4. The column `sales_users."auth_user-id"` has a hyphen. Keep it; the legacy app depends on it.
5. Nothing is reported as done when an external call failed. Surface failures to the user (contract 2.2, 2.7g).

## Stack and layout
- Next.js 16 App Router, React 19, TypeScript, Tailwind 4, pnpm. Read `node_modules/next/dist/docs/` before using a Next API: `middleware` is now `src/proxy.ts`, and route props use the global `PageProps<"/path">` / `LayoutProps<"/path">` types (run `pnpm exec next typegen`).
- `src/lib/supabase/{server,client}.ts`: Supabase clients acting as the signed-in user, so RLS applies. `src/lib/auth.ts`: `getProfile()` and `isAdmin()`; every page and server action goes through them.
- `src/lib/supabase/database.types.ts`: generated; regenerate after each migration.
- `src/app/(app)/`: signed-in pages inside the sidebar shell. `src/app/login/`: username + password login via the `get_login_email` RPC.
- `src/components/ui/`: Card, Button, DeltaPill, HatchBar, Empty/Error/Loading states. `src/components/shell/`: sidebar, nav list (`nav.ts`), page header.
- Roles: `Admin` sees everything; `Sales`, `Digital Marketing`, `Secretary` see only rows RLS allows (leads assigned to them).

## Design
Follow `DESIGN.md` exactly (tokens in `src/app/globals.css`) and the antislop skills, including the Delivery Gate. Real numbers only: no invented stats, deltas, names or feed entries. Every data view has empty, loading and error states. Add a nav item only when its page exists. No em dashes in any text.

## Workflow
- Integration branch: `rebuild/nextjs` (draft PR into `main`). Each phase works on its own branch cut from it and opens a PR back into `rebuild/nextjs`.
- Before pushing: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`.
- Dev server: `pnpm dev --port 3210`.
