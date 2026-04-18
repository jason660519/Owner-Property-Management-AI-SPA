// filepath: apps/superadmin/app/api/backup/restore/route.ts
// POST /api/backup/restore  → restore data from a backup file (idempotent upsert)

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

interface RestoreResult {
  tables_restored: number;
  total_rows: number;
  details: Record<string, { restored: number; errors: number }>;
  storage_objects: number;
  errors: string[];
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/backup/restore',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = (await req.json()) as { id: string };
  if (!/^backup_\d{8}_\d{6}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid backup id' }, { status: 400 });
  }

  const filepath = path.join(BACKUP_DIR, `${id}.json`);
  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
  }

  const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as {
    version?: string;
    data: Record<string, Record<string, unknown>[]>;
  };

  const adminClient = createAdminClient();
  const result: RestoreResult = {
    tables_restored: 0,
    total_rows: 0,
    details: {},
    storage_objects: 0,
    errors: [],
  };

  const isV2 = backup.version === '2.0';

  // Restore storage.objects (special: uses storage schema)
  const storageKey = isV2 ? '_storage_objects' : 'storage_objects';
  const storageObjs = backup.data?.[storageKey] ?? [];
  for (const obj of storageObjs) {
    const { error } = await adminClient
      .schema('storage')
      .from('objects')
      .upsert(
        {
          id: obj['id'],
          bucket_id: obj['bucket_id'],
          name: obj['name'],
          metadata: obj['metadata'] ?? null,
          version: obj['version'] ?? null,
          level: obj['level'] ?? null,
          created_at: obj['created_at'],
          updated_at: obj['created_at'],
          last_accessed_at: obj['created_at'],
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (error) result.errors.push(`storage[${obj['name']}]: ${error.message}`);
    else result.storage_objects++;
  }

  // Restore public tables
  const skipKeys = new Set([storageKey, '_storage_objects']);

  if (isV2) {
    // v2: iterate all tables in data
    for (const [tableName, rows] of Object.entries(backup.data)) {
      if (skipKeys.has(tableName)) continue;
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const detail = { restored: 0, errors: 0 };

      for (const row of rows) {
        // Use upsert with id as conflict key (most tables use id as PK)
        const { error } = await adminClient
          .from(tableName)
          .upsert(row as Record<string, unknown>, { onConflict: 'id', ignoreDuplicates: true });

        if (error) {
          detail.errors++;
          if (detail.errors <= 3) {
            result.errors.push(`${tableName}: ${error.message}`);
          }
        } else {
          detail.restored++;
        }
      }

      result.details[tableName] = detail;
      result.total_rows += detail.restored;
      if (detail.restored > 0) result.tables_restored++;
    }
  } else {
    // v1 legacy: hardcoded tables
    const legacyTables = ['property_photos', 'property_documents'];
    for (const tableName of legacyTables) {
      const rows = backup.data?.[tableName] ?? [];
      if (rows.length === 0) continue;

      const detail = { restored: 0, errors: 0 };
      for (const row of rows) {
        const { error } = await adminClient
          .from(tableName)
          .upsert(row as Record<string, unknown>, { onConflict: 'id', ignoreDuplicates: true });
        if (error) {
          detail.errors++;
          result.errors.push(`${tableName}[${row['id']}]: ${error.message}`);
        } else {
          detail.restored++;
        }
      }
      result.details[tableName] = detail;
      result.total_rows += detail.restored;
      if (detail.restored > 0) result.tables_restored++;
    }
  }

  return NextResponse.json({
    success: result.errors.length === 0,
    restored: result,
  });
}
