import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  BACKUP_SETTINGS_KEY,
  loadBackupSettings,
  normalizeSchedule,
  type DestinationKey,
} from '@/lib/backup/settings';
import { runBackup } from '@/lib/backup/run-backup';
import { insertBackupRunLog } from '@/lib/backup/log-backup-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

function parseTime(time: string): { h: number; m: number } {
  const [hRaw, mRaw] = time.split(':');
  const h = Number.parseInt(hRaw ?? '0', 10);
  const m = Number.parseInt(mRaw ?? '0', 10);
  return {
    h: Number.isNaN(h) ? 0 : Math.min(23, Math.max(0, h)),
    m: Number.isNaN(m) ? 0 : Math.min(59, Math.max(0, m)),
  };
}

function nextRunAt(schedule: ReturnType<typeof normalizeSchedule>, from = new Date()): Date {
  const { h, m } = parseTime(schedule.time);
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setHours(h, m, 0, 0);

  if (schedule.frequency === 'daily') {
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (schedule.frequency === 'weekly') {
    const delta = (schedule.day_of_week - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    if (candidate <= from) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }

  candidate.setDate(Math.min(28, Math.max(1, schedule.day_of_month)));
  if (candidate <= from) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

function isDue(schedule: ReturnType<typeof normalizeSchedule>, now: Date): boolean {
  if (!schedule.enabled) return false;
  if (!schedule.last_run_at) return true;
  const lastRun = new Date(schedule.last_run_at);
  if (Number.isNaN(lastRun.getTime())) return true;
  return nextRunAt(schedule, lastRun) <= now;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await loadBackupSettings();
  const now = new Date();

  const dueKeys: DestinationKey[] = (['project', 'local_device', 'gdrive', 's3'] as DestinationKey[])
    .filter((key) => isDue(normalizeSchedule(settings.destination_schedules[key]), now));

  if (dueKeys.length === 0) {
    return NextResponse.json({ processed: false, due: [] });
  }

  const shouldCopyToLocalDevice = dueKeys.includes('local_device') && settings.local_device_enabled && Boolean(settings.local_device_path);
  const shouldUploadGdrive = dueKeys.includes('gdrive');
  const shouldUploadS3 = dueKeys.includes('s3');
  const result = await runBackup({
    trigger: 'auto_schedule',
    localDevicePath: shouldCopyToLocalDevice ? settings.local_device_path : '',
    retentionCount: settings.retention_count,
    cloudTargets: {
      gdrive: shouldUploadGdrive,
      s3: shouldUploadS3,
    },
  });

  const updated = { ...settings.destination_schedules };
  for (const key of dueKeys) {
    updated[key] = {
      ...updated[key],
      last_run_at: now.toISOString(),
      last_status: result.success ? 'success' : 'error',
    };
  }

  const admin = createAdminClient();
  await admin
    .from('system_settings')
    .upsert(
      {
        key: BACKUP_SETTINGS_KEY,
        value: {
          ...settings,
          destination_schedules: updated,
        },
        description: '備份設定（目的地、排程、保留數量）',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (!result.success) {
    await insertBackupRunLog({
      trigger: 'auto_schedule',
      destinations: dueKeys,
      success: false,
      errorMessage: result.error,
      durationMs: result.durationMs,
    });
    return NextResponse.json({
      processed: true,
      due: dueKeys,
      error: result.error,
    });
  }

  await insertBackupRunLog({
    trigger: 'auto_schedule',
    destinations: result.destinations,
    backupId: result.id,
    filename: result.filename,
    success: true,
    stats: result.stats,
    cloudResult: result.cloud,
    durationMs: result.durationMs,
  });

  return NextResponse.json({
    processed: true,
    due: dueKeys,
    id: result.id,
    filename: result.filename,
  });
}
