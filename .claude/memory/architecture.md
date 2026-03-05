# Architecture Notes

## Project Structure

Monorepo with two active Next.js 15 apps:
- `apps/web/` (Port 3000) — Web App (房東/租客/買家)
- `apps/superadmin/` (Port 3001) — Super Admin dashboard
- `supabase/` — migrations only, SQL nowhere else
- `packages/types/` — shared TypeScript types (generated via `supabase gen types`)

## Key File Paths

| Purpose | Path |
|---|---|
| Supabase admin client | `apps/superadmin/utils/supabase/admin.ts` |
| Supabase server client | `apps/*/utils/supabase/server.ts` |
| Superadmin sidebar nav | `apps/superadmin/components/layout/Sidebar.tsx` |
| Roadmap data | `apps/superadmin/app/data/roadmap.ts` |
| Design system docs | `docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md` |

## Next.js Server/Client Pattern

- Pure utility functions → separate `utils.ts` (importable from Client Components)
- Server actions → `actions.ts` with `'use server'` (NOT importable as regular functions in Client)
- Default to Server Components; add `'use client'` only for interactivity

## Supabase Client Usage

```ts
// Admin (bypasses RLS, service role)
import { createAdminClient } from '@/utils/supabase/admin'

// Server Component / Action (user context, respects RLS)
import { createClient } from '@/utils/supabase/server'

// Client Component
import { createClient } from '@/utils/supabase/client'
```

## UI Component Conventions

- Badge variants: `'default' | 'success' | 'warning' | 'error' | 'info'` — never `'danger'`
- Sidebar navItems in `Sidebar.tsx` — add lucide-react icon + path for new pages
- State priority: useState → URL params → React Context → Zustand
