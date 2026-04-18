#!/usr/bin/env -S npx tsx
// Row 145 Sprint 1 — File Inventory scanner CLI.
//
// Recursively walks $PEOPLE_DB_SOURCE_ROOT (or --root <path>), computes sha256
// for each file, and upserts into public.people_db_files. Designed to be
// rerunnable: unchanged files are no-ops; deleted files are flagged as
// `missing`; modified files reset to `pending` with a new sha256.
//
// Usage:
//   PEOPLE_DB_SOURCE_ROOT=/Volumes/KLEVV-4T-2/台灣尋人資料庫 \
//     npx tsx tools/people-db/scan.ts
//   # or
//   npx tsx tools/people-db/scan.ts --root /path/to/data
//
// Env:
//   PEOPLE_DB_SOURCE_ROOT   default source root if --root not given
//   SUPABASE_URL            required, local default http://localhost:54321
//   SUPABASE_SERVICE_ROLE_KEY  required, grabbed from `supabase start` output
//
// Flags:
//   --root <path>   override source root
//   --dry-run       walk + hash but don't write DB
//   --limit <n>     stop after n files (smoke test)

import { createReadStream, statSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import {
  classifyStatus,
  computeSha256Stream,
  deriveDatasetRoot,
  detectMimeByExt,
  planFileAction,
  type ExistingFileRow,
  type FileAction,
  type InventoryStatus,
} from '../../apps/superadmin/lib/people-db/inventory';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    root: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    limit: { type: 'string' },
  },
  allowPositionals: false,
});

const sourceRoot = values.root ?? process.env.PEOPLE_DB_SOURCE_ROOT;
if (!sourceRoot) {
  console.error(
    'ERROR: source root is required. Set PEOPLE_DB_SOURCE_ROOT or pass --root <path>.',
  );
  process.exit(1);
}

const absRoot = resolve(sourceRoot);
try {
  const stats = statSync(absRoot);
  if (!stats.isDirectory()) {
    console.error(`ERROR: ${absRoot} is not a directory`);
    process.exit(1);
  }
} catch (err) {
  console.error(`ERROR: cannot stat ${absRoot}: ${(err as Error).message}`);
  process.exit(1);
}

const dryRun = Boolean(values['dry-run']);
const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;

// ---------------------------------------------------------------------------
// Supabase client (service_role, bypasses RLS)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY && !dryRun) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required (or use --dry-run).');
  process.exit(1);
}

const db = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip macOS metadata and common junk
    if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Counter design — mutually exclusive outcome per file plus orthogonal
// action & classification counters so dry-run and real-run produce the same
// numbers:
//
//   file-level outcome (sum = scanned - errors - unsupportedOnly):
//     inserted      — new row
//     contentChanged — existing sha256 differed → reset to pending
//     pathMoved     — sha256 same, source_path differed (dedup / moved file)
//     unchanged     — truly no-op
//
//   orthogonal flags (may overlap with outcome above; count independently):
//     reclassified  — status flipped skipped_unsupported → pending
//     unsupportedExt — scan classifier marked ext as unsupported this pass
//
//   end-of-scan cleanup:
//     missingFlagged — rows whose sha256 was absent from this walk
interface Counters {
  scanned: number;
  errors: number;
  inserted: number;
  contentChanged: number;
  pathMoved: number;
  unchanged: number;
  reclassified: number;
  unsupportedExt: number;
  missingFlagged: number;
}

const counters: Counters = {
  scanned: 0,
  errors: 0,
  inserted: 0,
  contentChanged: 0,
  pathMoved: 0,
  unchanged: 0,
  reclassified: 0,
  unsupportedExt: 0,
  missingFlagged: 0,
};

const seenSha256 = new Set<string>();

async function processFile(absPath: string): Promise<void> {
  counters.scanned += 1;
  try {
    const stats = await stat(absPath);
    const ext = extname(absPath).toLowerCase();
    const sha256 = await computeSha256Stream(createReadStream(absPath));
    seenSha256.add(sha256);

    const { dataset_root, dataset_subpath } = deriveDatasetRoot(absPath, absRoot);
    const initialStatus = classifyStatus(ext);
    if (initialStatus === 'skipped_unsupported') {
      counters.unsupportedExt += 1;
    }

    // Fetch existing row (if any). In dry-run mode we still query — we need
    // to know what the plan is, we just skip the mutations.
    let existing: ExistingFileRow | null = null;
    if (db) {
      const { data } = await db
        .from('people_db_files')
        .select('id, sha256, size_bytes, mtime, source_path, status')
        .eq('sha256', sha256)
        .maybeSingle();
      if (data) {
        existing = {
          sha256: data.sha256,
          size_bytes: data.size_bytes,
          mtime: new Date(data.mtime),
          source_path: data.source_path,
          status: data.status as InventoryStatus,
        };
      }
    }

    const actions = planFileAction(existing, {
      sha256,
      size_bytes: stats.size,
      mtime: stats.mtime,
      source_path: absPath,
      ext,
    });

    // --- Count the planned outcome (runs in both dry-run and real mode) ---
    const hasInsert = actions.some((a) => a.type === 'insert');
    const hasReset = actions.some((a) => a.type === 'reset_content');
    const hasPathMove = actions.some((a) => a.type === 'update_path');
    const hasReclassify = actions.some((a) => a.type === 'reclassify');

    if (hasInsert) counters.inserted += 1;
    else if (hasReset) counters.contentChanged += 1;
    else if (hasPathMove) counters.pathMoved += 1;
    else counters.unchanged += 1;

    if (hasReclassify) counters.reclassified += 1;

    if (dryRun || !db) return;

    // --- Apply the plan ---
    await applyActions(actions, {
      existing,
      sha256,
      absPath,
      dataset_root,
      dataset_subpath,
      ext,
      stats,
      initialStatus,
    });
  } catch (err) {
    counters.errors += 1;
    console.error(`ERROR ${absPath}:`, (err as Error).message);
  }
}

interface ApplyCtx {
  existing: ExistingFileRow | null;
  sha256: string;
  absPath: string;
  dataset_root: string;
  dataset_subpath: string | null;
  ext: string;
  stats: { size: number; mtime: Date };
  initialStatus: 'pending' | 'skipped_unsupported';
}

async function applyActions(actions: FileAction[], ctx: ApplyCtx): Promise<void> {
  if (!db) return;

  // New row — single INSERT covers everything for brand-new files.
  if (actions.some((a) => a.type === 'insert')) {
    const { error } = await db.from('people_db_files').insert({
      sha256: ctx.sha256,
      source_path: ctx.absPath,
      dataset_root: ctx.dataset_root,
      dataset_subpath: ctx.dataset_subpath,
      ext: ctx.ext,
      mime: detectMimeByExt(ctx.ext),
      size_bytes: ctx.stats.size,
      mtime: ctx.stats.mtime.toISOString(),
      status: ctx.initialStatus,
    });
    if (error) throw error;
    return;
  }

  // Existing row — collapse the matching actions into a single UPDATE patch
  // so we only round-trip once per file.
  if (!ctx.existing) return;

  const patch: Record<string, unknown> = {};
  for (const action of actions) {
    switch (action.type) {
      case 'update_path':
        patch.source_path = action.to;
        patch.mtime = ctx.stats.mtime.toISOString();
        break;
      case 'reset_content':
        patch.source_path = ctx.absPath;
        patch.size_bytes = ctx.stats.size;
        patch.mtime = ctx.stats.mtime.toISOString();
        patch.status = 'pending';
        patch.attempts = 0;
        patch.error_msg = null;
        break;
      case 'reclassify':
        patch.status = action.to;
        patch.attempts = 0;
        patch.error_msg = null;
        break;
      case 'insert':
        // Handled above.
        break;
    }
  }

  if (Object.keys(patch).length === 0) return; // truly unchanged

  const { error } = await db
    .from('people_db_files')
    .update(patch)
    .eq('sha256', ctx.sha256);
  if (error) throw error;
}

async function flagMissing(): Promise<void> {
  if (dryRun || !db) return;
  // Any row whose sha256 wasn't seen on this pass is either deleted or behind
  // a permission barrier. Flag missing but keep the row so future scans can
  // resurrect it (rename / restored from backup).
  const BATCH = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await db
      .from('people_db_files')
      .select('id, sha256, status')
      .neq('status', 'missing')
      .range(offset, offset + BATCH - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    const stale = data.filter((row) => !seenSha256.has(row.sha256));
    if (stale.length > 0) {
      const { error: updErr } = await db
        .from('people_db_files')
        .update({ status: 'missing' })
        .in(
          'id',
          stale.map((r) => r.id),
        );
      if (updErr) throw updErr;
      counters.missingFlagged += stale.length;
    }
    if (data.length < BATCH) break;
    offset += BATCH;
  }
}

async function main() {
  console.log(`Scanning ${absRoot}${dryRun ? ' (dry run)' : ''}...`);
  const started = Date.now();

  for await (const file of walk(absRoot)) {
    if (counters.scanned >= limit) break;
    await processFile(file);
    if (counters.scanned % 500 === 0) {
      console.log(
        `  progress: scanned=${counters.scanned} inserted=${counters.inserted} unchanged=${counters.unchanged} pathMoved=${counters.pathMoved} errors=${counters.errors}`,
      );
    }
  }

  await flagMissing();

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\nDone in', seconds, 's');
  console.log(JSON.stringify(counters, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
