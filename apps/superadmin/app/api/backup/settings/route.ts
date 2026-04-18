// filepath: apps/superadmin/app/api/backup/settings/route.ts
// GET  /api/backup/settings → load backup config from system_settings
// POST /api/backup/settings → save backup config

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  BACKUP_SETTINGS_KEY,
  backupSettingsDefaults,
  normalizeBackupSettings,
  type BackupSettings,
} from '@/lib/backup/settings';

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/backup/settings',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('system_settings')
    .select('value')
    .eq('key', BACKUP_SETTINGS_KEY)
    .single();
  return NextResponse.json(normalizeBackupSettings((data?.value ?? {}) as Partial<BackupSettings>));
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/backup/settings',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = (await req.json()) as Partial<BackupSettings>;
  const adminClient = createAdminClient();

  const value: BackupSettings = {
    local_device_enabled: body.local_device_enabled ?? backupSettingsDefaults.local_device_enabled,
    local_device_path: body.local_device_path ?? backupSettingsDefaults.local_device_path,
    auto_on_stop: body.auto_on_stop ?? backupSettingsDefaults.auto_on_stop,
    retention_count: body.retention_count ?? backupSettingsDefaults.retention_count,
    destination_schedules: normalizeBackupSettings(body).destination_schedules,
  };

  const { error } = await adminClient.from('system_settings').upsert(
    { key: BACKUP_SETTINGS_KEY, value, description: '備份設定（目的地、排程、保留數量）', updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  // Also update the per-key path for shell script access
  await adminClient.from('system_settings').upsert(
    { key: 'backup_local_device_path', value: value.local_device_path, description: 'backup local device path (used by stop.sh)', updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, value });
}
