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
