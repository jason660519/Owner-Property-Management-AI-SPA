#!/usr/bin/env node
// Row 145 Sprint 5 — Blue/green reindex from people_database (v1) to
// people_database_v2 (IK-tuned mapping).
//
// Strategy:
//   1. Read mapping JSON from tools/people-db/es-mappings/people_v2.json.
//   2. Create destination index if it does not exist (no-op if exists).
//   3. Kick off `_reindex` with `wait_for_completion=false` and capture the
//      task id so we can resume polling after a Ctrl+C.
//   4. Poll task progress (created/updated/total) and tail to stdout.
//   5. On completion print a summary; alias-swap is left to swap-alias.sh
//      so a human can `_search` against v2 first to validate.
//
// Throttling:
//   --requests-per-second N   passes through to _reindex (default 1000)
//   --slices N                parallel slice count (default auto)
//
// Usage:
//   npx tsx tools/people-db/reindex.ts                   # dest = people_database_v2
//   npx tsx tools/people-db/reindex.ts --dest people_v3  # custom dest
//   npx tsx tools/people-db/reindex.ts --resume <taskId> # poll an existing task

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'es-url': { type: 'string' },
    src: { type: 'string', default: 'people_database' },
    dest: { type: 'string', default: 'people_database_v2' },
    mapping: { type: 'string' },
    'requests-per-second': { type: 'string', default: '1000' },
    slices: { type: 'string', default: 'auto' },
    resume: { type: 'string' },
  },
});

const ES = values['es-url'] ?? process.env.ES_URL ?? 'http://127.0.0.1:9200';
const SRC = values.src ?? 'people_database';
const DEST = values.dest ?? 'people_database_v2';
const MAPPING_PATH =
  values.mapping ?? resolve(process.cwd(), 'tools/people-db/es-mappings/people_v2.json');
const RPS = values['requests-per-second'] ?? '1000';
const SLICES = values.slices ?? 'auto';

async function esRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ES ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function ensureDestIndex(): Promise<void> {
  const exists = await fetch(`${ES}/${DEST}`).then((r) => r.status === 200);
  if (exists) {
    console.log(`✓ destination index ${DEST} already exists — skipping create`);
    return;
  }
  console.log(`creating ${DEST}…`);
  // Strip _comment field — ES rejects unknown top-level keys.
  const raw = await readFile(MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  delete parsed._comment;
  await esRequest('PUT', `/${DEST}`, parsed);
  console.log(`✓ created ${DEST}`);
}

interface ReindexStartResponse {
  task: string;
}

async function startReindex(): Promise<string> {
  console.log(`starting reindex ${SRC} → ${DEST} (rps=${RPS}, slices=${SLICES})`);
  const r = await esRequest<ReindexStartResponse>(
    'POST',
    `/_reindex?wait_for_completion=false&requests_per_second=${RPS}&slices=${SLICES}`,
    {
      source: { index: SRC, size: 1000 },
      dest: { index: DEST },
    },
  );
  console.log(`✓ task started: ${r.task}`);
  return r.task;
}

interface TaskStatusResponse {
  completed: boolean;
  task: {
    status: {
      total: number;
      created: number;
      updated: number;
      deleted: number;
      batches: number;
      version_conflicts: number;
    };
  };
  response?: {
    failures: unknown[];
  };
}

async function pollTask(taskId: string): Promise<void> {
  let last = '';
  while (true) {
    const r = await esRequest<TaskStatusResponse>('GET', `/_tasks/${taskId}`);
    const s = r.task.status;
    const line = `  total=${s.total} created=${s.created} updated=${s.updated} batches=${s.batches} conflicts=${s.version_conflicts}`;
    if (line !== last) {
      console.log(line);
      last = line;
    }
    if (r.completed) {
      const failures = r.response?.failures ?? [];
      if (failures.length > 0) {
        console.warn(`⚠ ${failures.length} doc-level failures (first 3):`);
        console.warn(JSON.stringify(failures.slice(0, 3), null, 2));
      }
      console.log('✓ reindex complete');
      return;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
}

async function main() {
  if (values.resume) {
    console.log(`resuming poll on task ${values.resume}`);
    await pollTask(values.resume);
    return;
  }

  await ensureDestIndex();
  const taskId = await startReindex();
  console.log(
    `(if interrupted, resume with: npx tsx tools/people-db/reindex.ts --resume ${taskId})`,
  );
  await pollTask(taskId);

  const count = await esRequest<{ count: number }>('GET', `/${DEST}/_count`);
  console.log(`${DEST} doc count: ${count.count}`);
  console.log('next: validate with _search against', DEST, '→ then swap-alias.sh');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
