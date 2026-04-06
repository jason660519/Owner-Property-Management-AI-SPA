import { createAdminClient } from '@/utils/supabase/admin';
import type { CloudUploadResult } from '@/lib/backup/cloudUpload';

export interface InsertBackupRunLogInput {
  trigger: string;
  destinations: string[];
  backupId?: string | null;
  filename?: string | null;
  success: boolean;
  errorMessage?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats?: Record<string, any> | null;
  cloudResult?: CloudUploadResult | null;
  durationMs: number;
}

export async function insertBackupRunLog(input: InsertBackupRunLogInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('backup_run_logs').insert({
    trigger: input.trigger,
    destinations: input.destinations,
    backup_id: input.backupId ?? null,
    filename: input.filename ?? null,
    success: input.success,
    error_message: input.errorMessage ?? null,
    stats: input.stats ?? null,
    cloud_result: input.cloudResult ?? null,
    duration_ms: input.durationMs,
  });
  if (error) {
    console.error('[backup_run_logs]', error.message);
  }
}
