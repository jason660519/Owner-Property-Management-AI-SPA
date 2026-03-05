# Project Memory

## Topic Files (read on demand)

- **architecture.md** — App structure, key file paths, Next.js server/client patterns, Supabase client usage, UI conventions
- **features.md** — Completed features tracking, roadmap update rules

## Quick Reference

### Migration Naming
Format: `YYYYMMDDHHMMSS_description.sql` — location: `supabase/migrations/` only

### Badge Variants
Valid: `'default' | 'success' | 'warning' | 'error' | 'info'` — `'danger'` does NOT exist

### Sidebar (superadmin)
`apps/superadmin/components/layout/Sidebar.tsx` — add lucide-react icon + path to `navItems`

### Supabase Clients
- Admin (bypass RLS): `import { createAdminClient } from '@/utils/supabase/admin'`
- Server (user context): `import { createClient } from '@/utils/supabase/server'`

### Server/Client Component Rule
Pure utils → `utils.ts` (importable anywhere). Server actions → `actions.ts` (server only).
