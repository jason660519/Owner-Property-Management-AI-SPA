'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export type OrphanedFile = {
  name: string;
  bucket_id: string;
  size: number;
  created_at: string;
  url: string;
};

export type StorageQuota = {
  user_id: string;
  user_name?: string;
  quota_mb: number;
  used_bytes: number;
  updated_at: string;
};

export type FileTypeStat = {
  type: string;
  count: number;
  size: number;
};

export type StorageSummary = {
  totalSize: number;
  totalFiles: number;
  byBucket: Record<string, { size: number; count: number }>;
  byType: FileTypeStat[];
};

export async function getStorageSummary(): Promise<StorageSummary> {
  const adminClient = createAdminClient();
  const buckets = ['property-photos', 'property-documents'];

  const summary: StorageSummary = {
    totalSize: 0,
    totalFiles: 0,
    byBucket: {},
    byType: [],
  };

  const typeMap: Record<string, { count: number; size: number }> = {};

  for (const bucket of buckets) {
    const { data: files, error } = await adminClient.storage.from(bucket).list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error(`Error listing files in ${bucket}:`, error);
      continue;
    }

    let bucketSize = 0;
    let bucketCount = 0;

    for (const file of files || []) {
      if (file.id === undefined) continue; // Skip folders

      const fileSize = file.metadata?.size ?? 0;
      bucketSize += fileSize;
      bucketCount++;

      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      if (!typeMap[ext]) typeMap[ext] = { count: 0, size: 0 };
      typeMap[ext].count++;
      typeMap[ext].size += fileSize;
    }

    summary.byBucket[bucket] = { size: bucketSize, count: bucketCount };
    summary.totalSize += bucketSize;
    summary.totalFiles += bucketCount;
  }

  summary.byType = Object.entries(typeMap).map(([type, stats]) => ({
    type,
    ...stats,
  })).sort((a, b) => b.size - a.size);

  return summary;
}

export async function getFileTypeDistribution(): Promise<FileTypeStat[]> {
  const summary = await getStorageSummary();
  return summary.byType;
}

export async function getOrphanedFiles(limit = 1000): Promise<OrphanedFile[]> {
  const adminClient = createAdminClient();
  const orphans: OrphanedFile[] = [];

  // 1. Get all file paths from DB tables
  const { data: photos } = await adminClient.from('property_photos').select('storage_path');
  const { data: docs } = await adminClient.from('property_documents').select('storage_path');
  
  const dbPaths = new Set([
    ...(photos || []).map(p => p.storage_path),
    ...(docs || []).map(d => d.storage_path),
  ]);

  // 2. Scan buckets and compare
  const buckets = ['property-photos', 'property-documents'];
  for (const bucket of buckets) {
    const { data: files } = await adminClient.storage.from(bucket).list('', { limit });

    for (const file of files || []) {
      if (file.id === undefined) continue;

      if (!dbPaths.has(file.name)) {
        const { data: urlData } = await adminClient.storage.from(bucket).createSignedUrl(file.name, 3600);
        orphans.push({
          name: file.name,
          bucket_id: bucket,
          size: file.metadata?.size ?? 0,
          created_at: file.created_at,
          url: urlData?.signedUrl || '',
        });
      }
    }
  }

  return orphans;
}

export async function getStorageQuotas(): Promise<StorageQuota[]> {
  const adminClient = createAdminClient();

  const { data: quotas } = await adminClient.from('storage_quotas').select('*');

  const { data: usage } = await adminClient.rpc('get_storage_usage_per_user');

  return (quotas || []).map(q => {
    const usageRows = (usage ?? []) as { user_id: string; total_bytes: number | null }[];
    const userUsage = usageRows.find((u) => u.user_id === q.user_id);
    return {
      user_id: q.user_id,
      quota_mb: q.quota_mb,
      used_bytes: userUsage?.total_bytes ?? 0,
      updated_at: q.updated_at,
    };
  });
}

export async function deleteFile(bucketId: string, path: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.storage.from(bucketId).remove([path]);
  if (error) throw error;
  return { success: true };
}

export async function setUserQuota(userId: string, quotaMb: number) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('storage_quotas')
    .upsert({ user_id: userId, quota_mb: quotaMb, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { success: true };
}

export async function batchDeleteFiles(bucketId: string, paths: string[]) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage.from(bucketId).remove(paths);
  if (error) throw error;
  return { success: true, deleted: data?.length || 0 };
}
