import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';
import { uploadBackupToCloud, type CloudUploadResult } from '@/lib/backup/cloudUpload';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// Tables to skip during backup (logs, caches, ephemeral data)
const SKIP_TABLES = new Set([
  'web_vitals',
  'perf_metrics',
  'backup_restore_logs',
]);

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function backupId(filename: string) {
  return filename.replace('.json', '');
}

export interface BackupStats {
  table_count: number;
  total_rows: number;
  tables: Record<string, number>;
  storage_files: number;
  storage_files_size: number;
  storage_files_errors: number;
}

const STORAGE_BUCKETS = ['property-photos', 'property-documents'];

export interface RunBackupOptions {
  trigger: string;
  localDevicePath?: string;
  retentionCount?: number;
  cloudTargets?: {
    gdrive?: boolean;
    s3?: boolean;
  };
}

function buildDestinations(
  localDevicePath: string,
  cloud: CloudUploadResult,
): string[] {
  const d: string[] = ['project'];
  if (localDevicePath.trim()) d.push('local_device');
  if (cloud.gdrive !== undefined) d.push('gdrive');
  if (cloud.s3 !== undefined) d.push('s3');
  return d;
}

export type RunBackupSuccess = {
  success: true;
  id: string;
  filename: string;
  stats: BackupStats;
  cloud: CloudUploadResult;
  destinations: string[];
  durationMs: number;
};

export type RunBackupFailure = {
  success: false;
  error: string;
  durationMs: number;
};

export type RunBackupResult = RunBackupSuccess | RunBackupFailure;

export async function runBackup(options: RunBackupOptions): Promise<RunBackupResult> {
  const started = Date.now();
  try {
    ensureBackupDir();
    const adminClient = createAdminClient();

    // 1. Dynamically discover all public tables
    const { data: tableRows, error: tableErr } = await adminClient
      .rpc('get_public_tables' as never) // Falls back to raw query below
      .select('*');

    let tableNames: string[] = [];

    if (tableErr || !tableRows) {
      // Fallback: query information_schema directly via a known table
      const { data: schemaData } = await adminClient
        .from('system_settings')
        .select('key')
        .limit(0);

      // Use a raw approach: fetch table list from a dedicated RPC or hardcode discovery
      // Since Supabase JS doesn't support information_schema directly,
      // we'll use the PostgREST schema endpoint
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const swagger = await res.json();
        // PostgREST root returns OpenAPI spec with paths
        if (swagger?.paths) {
          tableNames = Object.keys(swagger.paths)
            .map((p) => p.replace('/', ''))
            .filter((t) => t && !t.startsWith('rpc/'));
        } else if (swagger?.definitions) {
          tableNames = Object.keys(swagger.definitions);
        }
      }

      // If swagger approach fails, use system_settings query trick
      if (tableNames.length === 0 && !schemaData) {
        // Last resort: we know the tables from a static list
        tableNames = [];
      }
    } else {
      tableNames = (tableRows as Array<{ table_name: string }>).map((r) => r.table_name);
    }

    // Filter out skipped tables
    tableNames = tableNames.filter((t) => !SKIP_TABLES.has(t));

    // 2. Backup each table
    const data: Record<string, unknown[]> = {};
    const tableStats: Record<string, number> = {};
    let totalRows = 0;

    for (const table of tableNames) {
      try {
        const { data: rows, error } = await adminClient
          .from(table)
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50000);

        if (error) {
          // Some tables may not have created_at, retry without order
          const { data: rows2 } = await adminClient
            .from(table)
            .select('*')
            .limit(50000);
          const rowData = rows2 ?? [];
          data[table] = rowData;
          tableStats[table] = rowData.length;
          totalRows += rowData.length;
        } else {
          const rowData = rows ?? [];
          data[table] = rowData;
          tableStats[table] = rowData.length;
          totalRows += rowData.length;
        }
      } catch {
        // Skip tables that can't be queried
        tableStats[table] = -1;
      }
    }

    // 3. Backup storage.objects
    let storageFiles = 0;
    try {
      const { data: storageObjects } = await adminClient
        .from('storage.objects' as 'storage')
        .select('id, bucket_id, name, metadata, version, level, created_at')
        .in('bucket_id', ['property-photos', 'property-documents'])
        .order('created_at');
      data['_storage_objects'] = storageObjects ?? [];
      storageFiles = storageObjects?.length ?? 0;
    } catch {
      data['_storage_objects'] = [];
    }

    // 4. Download actual files from Storage buckets
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupDirName = `backup_${timestamp}`;
    const backupSubDir = path.join(BACKUP_DIR, backupDirName);
    fs.mkdirSync(backupSubDir, { recursive: true });

    let storageFilesDownloaded = 0;
    let storageFilesSize = 0;
    let storageFilesErrors = 0;

    for (const bucket of STORAGE_BUCKETS) {
      const bucketDir = path.join(backupSubDir, 'files', bucket);

      // Recursively list all files in the bucket
      async function listAllFiles(prefix: string): Promise<string[]> {
        const paths: string[] = [];
        const { data: items } = await adminClient.storage.from(bucket).list(prefix, { limit: 10000 });
        if (!items) return paths;
        for (const item of items) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) {
            // It's a folder — recurse
            const subFiles = await listAllFiles(fullPath);
            paths.push(...subFiles);
          } else {
            paths.push(fullPath);
          }
        }
        return paths;
      }

      const allFilePaths = await listAllFiles('');
      if (allFilePaths.length === 0) continue;

      for (const filePath of allFilePaths) {
        try {
          const { data: blob, error: dlErr } = await adminClient.storage.from(bucket).download(filePath);
          if (dlErr || !blob) {
            storageFilesErrors++;
            continue;
          }
          const buffer = Buffer.from(await blob.arrayBuffer());
          const destPath = path.join(bucketDir, filePath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, buffer);
          storageFilesDownloaded++;
          storageFilesSize += buffer.length;
        } catch {
          storageFilesErrors++;
        }
      }
    }

    // 5. Write backup JSON
    const stats: BackupStats = {
      table_count: Object.keys(tableStats).filter((t) => tableStats[t] >= 0).length,
      total_rows: totalRows,
      tables: tableStats,
      storage_files: storageFilesDownloaded,
      storage_files_size: storageFilesSize,
      storage_files_errors: storageFilesErrors,
    };

    const backup = {
      version: '2.0',
      created_at: now.toISOString(),
      trigger: options.trigger,
      stats,
      data,
    };

    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(backupSubDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    // Also write JSON to BACKUP_DIR root for backward compat (listing)
    const rootJsonPath = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(filepath, rootJsonPath);

    // 6. Copy entire backup folder to local device
    const localDevicePath = options.localDevicePath ?? '';
    if (localDevicePath && fs.existsSync(localDevicePath)) {
      try {
        const destDir = path.join(localDevicePath, backupDirName);
        copyDirSync(backupSubDir, destDir);
      } catch {
        // non-fatal
      }
    }

    // 7. Upload to cloud (JSON only)
    const cloudResult = await uploadBackupToCloud(rootJsonPath, filename, options.cloudTargets);

    // 8. Retention cleanup
    const retention = Math.max(1, options.retentionCount ?? 30);
    const allJsonFiles = fs.readdirSync(BACKUP_DIR).filter((f) => /^backup_\d{8}_\d{6}\.json$/.test(f)).sort();
    if (allJsonFiles.length > retention) {
      allJsonFiles.slice(0, allJsonFiles.length - retention).forEach((f) => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch { /* ignore */ }
        // Also remove the corresponding subdirectory
        const dirName = f.replace('.json', '');
        const dirPath = path.join(BACKUP_DIR, dirName);
        try { fs.rmSync(dirPath, { recursive: true, force: true }); } catch { /* ignore */ }
      });
    }

    const durationMs = Date.now() - started;
    return {
      success: true,
      id: backupId(filename),
      filename,
      stats,
      cloud: cloudResult,
      destinations: buildDestinations(localDevicePath, cloudResult),
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - started;
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    };
  }
}
