// filepath: apps/superadmin/app/api/backup/route.ts
// GET  /api/backup  → list all backup files
// POST /api/backup  → create a new backup

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runBackup } from '@/lib/backup/run-backup';
import { loadBackupSettings, type BackupSettings } from '@/lib/backup/settings';
import { insertBackupRunLog } from '@/lib/backup/log-backup-run';
import { getBackupCloudUploadFlags } from '@/lib/backup/cloudUpload';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupId(filename: string) {
  return filename.replace('.json', '');
}

function manualDestinations(settings: BackupSettings, cloud: { gdrive: boolean; s3: boolean }): string[] {
  const d: string[] = ['project'];
  if (settings.local_device_enabled && settings.local_device_path.trim()) d.push('local_device');
  if (cloud.gdrive) d.push('gdrive');
  if (cloud.s3) d.push('s3');
  return d;
}

// ── GET: list backups ──────────────────────────────────────────────────────────
export async function GET() {
  ensureBackupDir();

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^backup_\d{8}_\d{6}\.json$/.test(f))
    .sort()
    .reverse();

  const list = files.map((filename) => {
    const filepath = path.join(BACKUP_DIR, filename);
    const stat = fs.statSync(filepath);
    let meta = { version: '1.0', created_at: '', trigger: 'unknown', stats: { property_photos: 0, property_documents: 0, storage_objects: 0 } };
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(raw);
      meta = { version: parsed.version, created_at: parsed.created_at, trigger: parsed.trigger, stats: parsed.stats };
    } catch {
      // ignore parse errors
    }
    return {
      id: backupId(filename),
      filename,
      size: stat.size,
      ...meta,
    };
  });

  return NextResponse.json({ backups: list });
}

// ── POST: create backup ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { trigger?: string; local_device_path?: string };
  const trigger = body.trigger ?? 'manual';
  const settings = await loadBackupSettings();
  const cloudFlags = await getBackupCloudUploadFlags();
  const result = await runBackup({
    trigger,
    localDevicePath: body.local_device_path ?? (settings.local_device_enabled ? settings.local_device_path : ''),
    retentionCount: settings.retention_count,
  });

  if (!result.success) {
    await insertBackupRunLog({
      trigger,
      destinations: manualDestinations(settings, cloudFlags),
      success: false,
      errorMessage: result.error,
      durationMs: result.durationMs,
    });
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  await insertBackupRunLog({
    trigger,
    destinations: result.destinations,
    backupId: result.id,
    filename: result.filename,
    success: true,
    stats: result.stats,
    cloudResult: result.cloud,
    durationMs: result.durationMs,
  });

  return NextResponse.json({
    success: true,
    id: result.id,
    filename: result.filename,
    stats: result.stats,
    cloud: result.cloud,
    destinations: result.destinations,
    durationMs: result.durationMs,
  });
}
