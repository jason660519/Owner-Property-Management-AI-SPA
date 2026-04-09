// lib/backup/cloudUpload.ts
// Server-side helpers to upload a backup JSON to Google Drive (service account) and AWS S3.

import fs from 'fs';
import path from 'path';

// ── Google Drive upload (service account) ─────────────────────────────────────

async function getGDriveAccessToken(serviceAccountJson: string): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library');
  const credentials = JSON.parse(serviceAccountJson) as Record<string, unknown>;
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('Failed to obtain Google access token');
  return token.token;
}

export async function uploadToGoogleDrive(params: {
  filePath: string;
  filename: string;
  folderId: string;
  serviceAccountJson: string;
}): Promise<{ fileId: string; webViewLink: string }> {
  const { filePath, filename, folderId, serviceAccountJson } = params;
  const accessToken = await getGDriveAccessToken(serviceAccountJson);

  const fileContent = fs.readFileSync(filePath);

  // Use multipart upload
  const boundary = '-------314159265358979323846';
  const metadata = JSON.stringify({
    name: filename,
    mimeType: 'application/json',
    ...(folderId ? { parents: [folderId] } : {}),
  });

  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipart.length),
    },
    body: multipart,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive upload failed: ${err}`);
  }

  const data = await res.json() as { id: string; webViewLink: string };
  return { fileId: data.id, webViewLink: data.webViewLink };
}

// ── AWS S3 upload ─────────────────────────────────────────────────────────────

export async function uploadToS3(params: {
  filePath: string;
  filename: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
}): Promise<{ location: string }> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const { filePath, filename, bucket, region, accessKeyId, secretAccessKey, prefix } = params;
  const key = `${prefix}${filename}`.replace(/\/\//g, '/');

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const fileContent = fs.readFileSync(filePath);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: 'application/json',
  }));

  const location = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { location };
}

// ── Load cloud configs from DB ─────────────────────────────────────────────────

import { createAdminClient } from '@/utils/supabase/admin';

interface GDriveConfig {
  enabled: boolean;
  folder_id: string;
  service_account_json: string;
}

interface S3Config {
  enabled: boolean;
  bucket: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
  prefix: string;
}

async function loadSetting<T>(key: string, defaults: T): Promise<T> {
  const admin = createAdminClient();
  const { data } = await admin.from('system_settings').select('value').eq('key', key).single();
  return data?.value ? { ...defaults, ...(data.value as Partial<T>) } : defaults;
}

/** Which cloud providers would be attempted for a full backup (both enabled + creds). */
export async function getBackupCloudUploadFlags(): Promise<{ gdrive: boolean; s3: boolean }> {
  const [gdrive, s3] = await Promise.all([
    loadSetting<GDriveConfig>('backup_gdrive_config', { enabled: false, folder_id: '', service_account_json: '' }),
    loadSetting<S3Config>('backup_s3_config', { enabled: false, bucket: '', region: 'ap-northeast-1', access_key_id: '', secret_access_key: '', prefix: 'property-backups/' }),
  ]);
  return {
    gdrive: gdrive.enabled && gdrive.service_account_json.length > 10,
    s3: s3.enabled && Boolean(s3.bucket && s3.access_key_id && s3.secret_access_key),
  };
}

export interface CloudUploadResult {
  gdrive?: { success: boolean; fileId?: string; error?: string };
  s3?: { success: boolean; location?: string; error?: string };
}

export async function uploadBackupToCloud(
  filePath: string,
  filename: string,
  targets?: { gdrive?: boolean; s3?: boolean },
): Promise<CloudUploadResult> {
  const result: CloudUploadResult = {};

  const [gdrive, s3] = await Promise.all([
    loadSetting<GDriveConfig>('backup_gdrive_config', { enabled: false, folder_id: '', service_account_json: '' }),
    loadSetting<S3Config>('backup_s3_config', { enabled: false, bucket: '', region: 'ap-northeast-1', access_key_id: '', secret_access_key: '', prefix: 'property-backups/' }),
  ]);

  // Upload to Google Drive
  if ((targets?.gdrive ?? true) && gdrive.enabled && gdrive.service_account_json.length > 10) {
    try {
      const { fileId, webViewLink } = await uploadToGoogleDrive({
        filePath,
        filename,
        folderId: gdrive.folder_id,
        serviceAccountJson: gdrive.service_account_json,
      });
      result.gdrive = { success: true, fileId };
      void webViewLink; // available for future use
    } catch (err) {
      result.gdrive = { success: false, error: String(err) };
    }
  }

  // Upload to S3
  if ((targets?.s3 ?? true) && s3.enabled && s3.bucket && s3.access_key_id && s3.secret_access_key) {
    try {
      const { location } = await uploadToS3({
        filePath,
        filename,
        bucket: s3.bucket,
        region: s3.region,
        accessKeyId: s3.access_key_id,
        secretAccessKey: s3.secret_access_key,
        prefix: s3.prefix,
      });
      result.s3 = { success: true, location };
    } catch (err) {
      result.s3 = { success: false, error: String(err) };
    }
  }

  return result;
}
