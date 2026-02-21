'use server';

import { createAdminClient } from '../../utils/supabase/admin';

export interface StorageSummary {
  total_size_bytes: number;
  total_files: number;
  buckets: {
    name: string;
    count: number;
    size: number;
  }[];
}

export interface FileTypeStat {
  type: string;
  count: number;
  size: number;
}

export interface OrphanedFile {
  name: string;
  bucket_id: string;
  size: number;
  created_at: string;
  url: string;
}

export async function getStorageSummary(): Promise<StorageSummary> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_storage_summary');
  
  if (error) {
    console.error('Error fetching storage summary:', error);
    throw new Error('Failed to fetch storage summary');
  }
  
  return data as StorageSummary;
}

export async function getFileTypeDistribution(): Promise<FileTypeStat[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_storage_file_types');
  
  if (error) {
    console.error('Error fetching file types:', error);
    throw new Error('Failed to fetch file types');
  }
  
  return data as FileTypeStat[];
}

export async function getOrphanedFiles(limit = 100): Promise<OrphanedFile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('identify_orphaned_files', { limit_count: limit });
  
  if (error) {
    console.error('Error identifying orphaned files:', error);
    throw new Error('Failed to identify orphaned files');
  }
  
  return data as OrphanedFile[];
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  
  if (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export async function updateUserQuota(userId: string, quotaBytes: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('users_profile')
    .update({ storage_quota_bytes: quotaBytes })
    .eq('id', userId);

  if (error) {
    console.error('Error updating quota:', error);
    throw new Error('Failed to update quota');
  }
}

export interface StorageQuota {
  id: string;
  user_id: string;
  quota_bytes: number;
  used_bytes: number;
  notes: string | null;
  updated_at: string;
}

/** Fetch all storage quotas (admin) */
export async function getStorageQuotas(): Promise<StorageQuota[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('storage_quotas')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching storage quotas:', error);
    return [];
  }
  return (data as StorageQuota[]) ?? [];
}

/** Upsert user quota into storage_quotas table */
export async function setUserQuota(
  userId: string,
  quotaBytes: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('storage_quotas')
    .upsert(
      { user_id: userId, quota_bytes: quotaBytes, notes: notes ?? null },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error setting user quota:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Batch delete files from a bucket */
export async function batchDeleteFiles(
  bucket: string,
  paths: string[]
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  if (paths.length === 0) return { success: true, deleted: 0, errors: [] };

  const supabase = createAdminClient();
  const errors: string[] = [];
  let deleted = 0;

  // Process in chunks of 20 to avoid hitting limits
  const chunkSize = 20;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { data, error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) {
      errors.push(error.message);
    } else {
      deleted += data?.length ?? 0;
    }
  }

  return { success: errors.length === 0, deleted, errors };
}
