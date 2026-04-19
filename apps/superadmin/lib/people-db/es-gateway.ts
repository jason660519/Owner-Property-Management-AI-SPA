// Thin Elasticsearch gateway used by the Next.js route handlers in the
// people-db feature (Row 144). The legacy FastAPI proxy has been removed as
// part of the OpenClaw migration, so these routes talk to ES directly.
//
// Note: the legacy `requireSuperAdmin` helper and `AuthorizedUser` interface
// were removed in Issue #34 PR E — callers now use `requireSuperadmin` from
// `@/lib/auth/require-superadmin`.

export const ES_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
export const PEOPLE_DB_INDEX = process.env.PEOPLE_DB_INDEX ?? 'people_database';

export async function esSearch<T = unknown>(body: unknown): Promise<T> {
  const res = await fetch(`${ES_URL}/${PEOPLE_DB_INDEX}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elasticsearch ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface EsBulkResult {
  took: number;
  errors: boolean;
  indexed: number;
  failed: number;
  failures: Array<{ index: number; status: number; reason: string }>;
}

export async function esBulkIndex(docs: unknown[]): Promise<EsBulkResult> {
  if (docs.length === 0) {
    return { took: 0, errors: false, indexed: 0, failed: 0, failures: [] };
  }
  const lines: string[] = [];
  for (const doc of docs) {
    lines.push(JSON.stringify({ index: { _index: PEOPLE_DB_INDEX } }));
    lines.push(JSON.stringify(doc));
  }
  const body = `${lines.join('\n')}\n`;
  const res = await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elasticsearch bulk ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    took: number;
    errors: boolean;
    items: Array<{ index?: { status: number; error?: { reason: string } } }>;
  };
  const failures: EsBulkResult['failures'] = [];
  let indexed = 0;
  json.items.forEach((item, idx) => {
    const entry = item.index;
    if (!entry) return;
    if (entry.error) {
      failures.push({ index: idx, status: entry.status, reason: entry.error.reason });
    } else {
      indexed += 1;
    }
  });
  return {
    took: json.took,
    errors: json.errors,
    indexed,
    failed: failures.length,
    failures,
  };
}
