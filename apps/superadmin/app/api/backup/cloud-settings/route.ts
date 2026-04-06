// filepath: apps/superadmin/app/api/backup/cloud-settings/route.ts
// GET  /api/backup/cloud-settings → return configured cloud providers (secrets masked)
// POST /api/backup/cloud-settings → save cloud backup credentials

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export interface GDriveConfig {
  enabled: boolean;
  folder_id: string;
  service_account_json: string; // full JSON string (sensitive)
}

export interface S3Config {
  enabled: boolean;
  bucket: string;
  region: string;
  access_key_id: string;
  secret_access_key: string; // sensitive
  prefix: string;
}

// Masked versions returned to client
export interface GDriveConfigMasked {
  enabled: boolean;
  folder_id: string;
  configured: boolean; // true if service_account_json is set
}

export interface S3ConfigMasked {
  enabled: boolean;
  bucket: string;
  region: string;
  access_key_id: string;
  prefix: string;
  configured: boolean; // true if secret_access_key is set
}

const GDRIVE_KEY = 'backup_gdrive_config';
const S3_KEY = 'backup_s3_config';

const defaultGDrive: GDriveConfig = { enabled: false, folder_id: '', service_account_json: '' };
const defaultS3: S3Config = { enabled: false, bucket: '', region: 'ap-northeast-1', access_key_id: '', secret_access_key: '', prefix: 'property-backups/' };

async function loadConfig<T>(key: string, defaults: T): Promise<T> {
  const admin = createAdminClient();
  const { data } = await admin.from('system_settings').select('value').eq('key', key).single();
  return data?.value ? { ...defaults, ...(data.value as Partial<T>) } : defaults;
}

export async function GET() {
  const [gdrive, s3] = await Promise.all([
    loadConfig<GDriveConfig>(GDRIVE_KEY, defaultGDrive),
    loadConfig<S3Config>(S3_KEY, defaultS3),
  ]);

  const masked: { gdrive: GDriveConfigMasked; s3: S3ConfigMasked } = {
    gdrive: {
      enabled: gdrive.enabled,
      folder_id: gdrive.folder_id,
      configured: gdrive.service_account_json.length > 10,
    },
    s3: {
      enabled: s3.enabled,
      bucket: s3.bucket,
      region: s3.region,
      access_key_id: s3.access_key_id,
      prefix: s3.prefix,
      configured: s3.secret_access_key.length > 0,
    },
  };

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    gdrive?: Partial<GDriveConfig>;
    s3?: Partial<S3Config>;
  };

  const admin = createAdminClient();
  const errors: string[] = [];

  if (body.gdrive !== undefined) {
    const current = await loadConfig<GDriveConfig>(GDRIVE_KEY, defaultGDrive);
    const merged: GDriveConfig = {
      enabled: body.gdrive.enabled ?? current.enabled,
      folder_id: body.gdrive.folder_id ?? current.folder_id,
      // Only update service_account_json if provided (non-empty string)
      service_account_json: body.gdrive.service_account_json !== undefined && body.gdrive.service_account_json !== ''
        ? body.gdrive.service_account_json
        : current.service_account_json,
    };

    const { error } = await admin.from('system_settings').upsert(
      { key: GDRIVE_KEY, value: merged, description: '備份 Google Drive 設定', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) errors.push(`gdrive: ${error.message}`);
  }

  if (body.s3 !== undefined) {
    const current = await loadConfig<S3Config>(S3_KEY, defaultS3);
    const merged: S3Config = {
      enabled: body.s3.enabled ?? current.enabled,
      bucket: body.s3.bucket ?? current.bucket,
      region: body.s3.region ?? current.region,
      access_key_id: body.s3.access_key_id ?? current.access_key_id,
      prefix: body.s3.prefix ?? current.prefix,
      // Only update secret if provided
      secret_access_key: body.s3.secret_access_key !== undefined && body.s3.secret_access_key !== ''
        ? body.s3.secret_access_key
        : current.secret_access_key,
    };

    const { error } = await admin.from('system_settings').upsert(
      { key: S3_KEY, value: merged, description: '備份 AWS S3 設定', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) errors.push(`s3: ${error.message}`);
  }

  if (errors.length > 0) return NextResponse.json({ success: false, errors }, { status: 500 });
  return NextResponse.json({ success: true });
}
