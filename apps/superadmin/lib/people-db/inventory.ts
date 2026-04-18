// Row 145 Sprint 1 — File Inventory pure functions.
//
// This module owns the "can we process this file?" and "has it changed since
// last time?" logic. It is deliberately stateless — all DB interactions happen
// in the CLI / route handler layer. Keeping the hot logic pure makes it easy
// to unit-test without a live Postgres, and lets the batch worker call these
// functions against an in-memory cache during a large scan.

import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { Readable as ReadableType } from 'node:stream';

// ---------------------------------------------------------------------------
// sha256 — streaming so a single 5 GB mdb doesn't OOM the worker
// ---------------------------------------------------------------------------

/**
 * Computes the sha256 of a readable stream without buffering the whole thing
 * in memory. Consumes the stream end-to-end; caller should not read from it
 * afterwards.
 */
export function computeSha256Stream(stream: ReadableType | Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    stream.on('data', (chunk: Buffer | string) => {
      hash.update(chunk);
    });
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Dataset path derivation
// ---------------------------------------------------------------------------

export interface DatasetPathParts {
  dataset_root: string;
  dataset_subpath: string | null;
}

/**
 * Derives `dataset_root` (top-level folder under source root) and
 * `dataset_subpath` (everything between root and filename) from an absolute
 * file path. Throws if the file is not under the given source root or if it
 * is the root itself (no dataset folder to name).
 *
 * Examples:
 *   ROOT + /台北市里長/a.pdf           -> { dataset_root: '台北市里長', subpath: null }
 *   ROOT + /企業名錄/2012/三萬/b.xls   -> { dataset_root: '企業名錄', subpath: '2012/三萬' }
 */
export function deriveDatasetRoot(absPath: string, sourceRoot: string): DatasetPathParts {
  const normRoot = sourceRoot.replace(/\/+$/, '');
  if (!absPath.startsWith(`${normRoot}/`) && absPath !== normRoot) {
    throw new Error(`Path is not under source root: ${absPath}`);
  }
  if (absPath === normRoot) {
    throw new Error('Path equals source root; no dataset root to derive');
  }
  const rel = absPath.slice(normRoot.length + 1); // strip "ROOT/"
  const parts = rel.split('/');
  if (parts.length < 2) {
    // File sits directly under root with no dataset folder — treat the file
    // itself as its own dataset? No: we require every file live under a
    // dataset folder, or the tree-view and scoping break.
    throw new Error(`File must live under a dataset root folder: ${absPath}`);
  }
  const dataset_root = parts[0];
  const middle = parts.slice(1, -1); // drop filename
  const dataset_subpath = middle.length > 0 ? middle.join('/') : null;
  return { dataset_root, dataset_subpath };
}

// ---------------------------------------------------------------------------
// MIME detection — minimal, extension-only. The router does deeper content
// sniffing if needed; this is just enough to populate the inventory row.
// ---------------------------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.mdb': 'application/x-msaccess',
  '.accdb': 'application/x-msaccess',
  '.dbf': 'application/x-dbf',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  // FinePrint land-registry transcript (proprietary Windows format). Routed
  // through tools/fp-converter/convert_fp.py — extracts 所有權人 / 住址 /
  // 權狀字號 plus the structural transcript fields.
  '.fp': 'application/x-fineprint',
};

export function detectMimeByExt(ext: string): string {
  const normalized = ext.toLowerCase();
  return MIME_BY_EXT[normalized] ?? 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Re-parse decision
// ---------------------------------------------------------------------------

export interface FileIdentityLike {
  sha256: string;
  size_bytes: number;
  mtime: Date;
}

export interface ReparseDecision {
  reparse: boolean;
  reason?: 'content_changed';
  warning?: string;
}

/**
 * Given an existing inventory row and a fresh scan result, decide whether the
 * file needs to be reprocessed. sha256 is the sole source of truth for
 * "content equivalence"; size-mismatch-with-matching-sha256 is a pathological
 * case worth warning about (likely a hash collision or stale row) but should
 * NOT trigger a reparse because sha256 is what the pipeline keys on.
 */
export function shouldReparse(
  existing: FileIdentityLike,
  incoming: FileIdentityLike,
): ReparseDecision {
  if (existing.sha256 !== incoming.sha256) {
    return { reparse: true, reason: 'content_changed' };
  }
  if (existing.size_bytes !== incoming.size_bytes) {
    return {
      reparse: false,
      warning: `sha256 matches but size differs (existing=${existing.size_bytes}, incoming=${incoming.size_bytes})`,
    };
  }
  return { reparse: false };
}

// ---------------------------------------------------------------------------
// Status classification — called at scan time to assign initial status before
// any parser runs.
// ---------------------------------------------------------------------------

export type InventoryStatus =
  | 'pending'
  | 'parsing'
  | 'parsed'
  | 'ocr_queued'
  | 'normalized'
  | 'resolved'
  | 'indexed'
  | 'failed'
  | 'skipped_unsupported'
  | 'skipped_duplicate'
  | 'missing';

const SUPPORTED_EXTS = new Set([
  '.pdf',
  '.xlsx',
  '.xls',
  '.mdb',
  '.accdb',
  '.dbf',
  '.csv',
  '.txt',
  '.fp',
]);

export function classifyStatus(ext: string): 'pending' | 'skipped_unsupported' {
  return SUPPORTED_EXTS.has(ext.toLowerCase()) ? 'pending' : 'skipped_unsupported';
}

/**
 * When support for an extension is added later, rescans need to un-skip the
 * previously-unsupported rows. This helper returns the new status the row
 * should have — or `null` if the row is fine where it is.
 *
 * Only `skipped_unsupported -> pending` is allowed to auto-advance. Any row
 * that has started real processing (parsing / parsed / indexed / failed /
 * missing / ...) is left alone: demoting a live row during a rescan would be
 * destructive.
 */
export function reclassifyIfStale(
  currentStatus: InventoryStatus,
  ext: string,
): 'pending' | null {
  if (currentStatus !== 'skipped_unsupported') return null;
  return classifyStatus(ext) === 'pending' ? 'pending' : null;
}

// ---------------------------------------------------------------------------
// Scan planner — the decision core of the CLI. Pure, so we can unit-test the
// "what would happen" semantics without a live DB, and so `--dry-run` can
// produce meaningful counters instead of silently zeroing everything.
// ---------------------------------------------------------------------------

export interface ExistingFileRow extends FileIdentityLike {
  source_path: string;
  status: InventoryStatus;
}

export interface IncomingFile {
  sha256: string;
  size_bytes: number;
  mtime: Date;
  source_path: string;
  ext: string;
}

export type FileAction =
  | { type: 'insert' }
  // source_path differs — file was moved/renamed or is a duplicate copy
  // encountered in a different location on this walk.
  | { type: 'update_path'; to: string }
  // sha256 differs — content truly changed; the row must go back to pending
  // so downstream processing reruns.
  | { type: 'reset_content' }
  // Extension support was added since the row was last seen; flip status
  // back to pending.
  | { type: 'reclassify'; to: 'pending' };

/**
 * Decides which mutations (if any) a scan encounter should produce for a
 * given file. Returns an empty array for "truly unchanged" — the most common
 * case on a rescan, so the caller's unchanged counter is simply `actions.length === 0`.
 */
export function planFileAction(
  existing: ExistingFileRow | null,
  incoming: IncomingFile,
): FileAction[] {
  if (!existing) return [{ type: 'insert' }];

  const actions: FileAction[] = [];

  if (existing.source_path !== incoming.source_path) {
    actions.push({ type: 'update_path', to: incoming.source_path });
  }

  const decision = shouldReparse(existing, incoming);
  if (decision.reparse) {
    actions.push({ type: 'reset_content' });
  }

  const newStatus = reclassifyIfStale(existing.status, incoming.ext);
  if (newStatus) {
    actions.push({ type: 'reclassify', to: newStatus });
  }

  return actions;
}
