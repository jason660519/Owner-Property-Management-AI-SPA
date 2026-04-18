#!/usr/bin/env node
/**
 * Ensures a dev admin exists in the Supabase project pointed to by .env.local.
 * Run after `supabase start` (or against your dev project URL + service role key).
 *
 * Required in env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEV_ADMIN_PASSWORD
 * Optional: DEV_ADMIN_EMAIL (default a0405142777@gmail.com — project test admin email)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');

function mergeEnvFile(relPath) {
  const p = resolve(appRoot, relPath);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

mergeEnvFile('.env.local');
mergeEnvFile('.env');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.DEV_ADMIN_EMAIL ?? 'a0405142777@gmail.com')
  .replace(/\u00a0/g, ' ')
  .trim()
  .toLowerCase();
const password = process.env.DEV_ADMIN_PASSWORD;

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load them from apps/web/.env.local.',
  );
  process.exit(1);
}
if (!password) {
  console.error(
    'Set DEV_ADMIN_PASSWORD in apps/web/.env.local (local-only password for the admin user). Then re-run: npm run ensure-dev-admin',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  const existing = await findUserByEmail(email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Updated password for ${email} (${existing.id})`);
    return;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created user ${email} (${data.user?.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
