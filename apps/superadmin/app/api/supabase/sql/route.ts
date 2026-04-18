import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const MAX_LIMIT = 200;
const FORBIDDEN_SQL = /(insert|update|delete|drop|alter|create|grant|revoke|truncate|call|execute|copy)\b/i;
const SUPPORTED_SELECT = /^select\s+([\w*\s,\"]+)\s+from\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*(?:limit\s+(\d+))?\s*;?$/i;

interface ParsedSelect {
  columns: string;
  schema: string;
  table: string;
  limit: number;
}

function parseSelectQuery(raw: string): ParsedSelect | null {
  const query = raw.trim();
  if (!query || FORBIDDEN_SQL.test(query)) return null;

  const match = query.match(SUPPORTED_SELECT);
  if (!match) return null;

  const [, rawColumns, rawTable, rawLimit] = match;
  const [schemaCandidate, tableCandidate] = rawTable.includes('.')
    ? rawTable.split('.', 2)
    : ['public', rawTable];

  const columns = rawColumns
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean)
    .join(',');

  const limitNum = Number.parseInt(rawLimit ?? '50', 10);
  const limit = Number.isFinite(limitNum)
    ? Math.max(1, Math.min(MAX_LIMIT, limitNum))
    : 50;

  return {
    columns: columns || '*',
    schema: schemaCandidate,
    table: tableCandidate,
    limit,
  };
}

export async function POST(req: NextRequest) {
  // Issue #31: gate this endpoint behind a super_admin Supabase session.
  // The route uses the admin (service_role) client below, which bypasses RLS,
  // and middleware.ts's matcher does not cover /api/*, so without this check
  // any unauthenticated caller could read arbitrary tables.
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/supabase/sql',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string };
    const query = body.query ?? '';
    const parsed = parseSelectQuery(query);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'Only SELECT is allowed. Supported syntax: SELECT <columns> FROM [schema.]table [LIMIT n]',
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const fromBuilder =
      parsed.schema === 'public'
        ? admin.from(parsed.table)
        : admin.schema(parsed.schema).from(parsed.table);

    const { data, error } = await fromBuilder.select(parsed.columns).limit(parsed.limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      columns: parsed.columns,
      table: `${parsed.schema}.${parsed.table}`,
      limit: parsed.limit,
      rowCount: Array.isArray(data) ? data.length : 0,
      rows: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown query error' },
      { status: 500 },
    );
  }
}
