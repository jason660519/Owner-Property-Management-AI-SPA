// filepath: apps/superadmin/app/api/backup/health/route.ts
// GET /api/backup/health → storage integrity check

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/backup/health',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const adminClient = createAdminClient();

  const [
    { count: photosCount },
    { count: storagePhotoCount },
    { count: docsCount },
    { count: storageDocCount },
  ] = await Promise.all([
    adminClient.from('property_photos').select('*', { count: 'exact', head: true }),
    adminClient.schema('storage').from('objects').select('*', { count: 'exact', head: true })
      .eq('bucket_id', 'property-photos'),
    adminClient.from('property_documents').select('*', { count: 'exact', head: true }).eq('is_active', true),
    adminClient.schema('storage').from('objects').select('*', { count: 'exact', head: true })
      .eq('bucket_id', 'property-documents'),
  ]);

  const backupCount = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter((f) => /^backup_\d{8}_\d{6}\.json$/.test(f)).length
    : 0;

  // Latest backup info
  let latestBackup: { id: string; created_at: string; stats: Record<string, number> } | null = null;
  if (backupCount > 0) {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^backup_\d{8}_\d{6}\.json$/.test(f)).sort().reverse();
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, files[0]), 'utf-8'));
      latestBackup = { id: files[0].replace('.json', ''), created_at: raw.created_at, stats: raw.stats };
    } catch { /* ignore */ }
  }

  const photoMismatch = (photosCount ?? 0) !== (storagePhotoCount ?? 0);
  const docMismatch = (docsCount ?? 0) !== (storageDocCount ?? 0);
  const healthy = !photoMismatch && !docMismatch && (storagePhotoCount ?? 0) > 0;

  return NextResponse.json({
    healthy,
    property_photos: { db: photosCount ?? 0, storage: storagePhotoCount ?? 0, mismatch: photoMismatch },
    property_documents: { db: docsCount ?? 0, storage: storageDocCount ?? 0, mismatch: docMismatch },
    backup_count: backupCount,
    latest_backup: latestBackup,
  });
}
