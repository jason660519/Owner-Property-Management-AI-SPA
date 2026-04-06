import { createAdminClient } from '@/utils/supabase/admin';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleStatus = 'idle' | 'success' | 'error';
export type DestinationKey = 'project' | 'local_device' | 'gdrive' | 's3';

export interface DestinationSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string;
  day_of_week: number;
  day_of_month: number;
  last_run_at: string;
  last_status: ScheduleStatus;
}

export interface BackupSettings {
  local_device_enabled: boolean;
  local_device_path: string;
  auto_on_stop: boolean;
  retention_count: number;
  destination_schedules: {
    project: DestinationSchedule;
    local_device: DestinationSchedule;
    gdrive: DestinationSchedule;
    s3: DestinationSchedule;
  };
}

export const BACKUP_SETTINGS_KEY = 'backup_config';

export const defaultSchedule: DestinationSchedule = {
  enabled: false,
  frequency: 'daily',
  time: '02:00',
  day_of_week: 1,
  day_of_month: 1,
  last_run_at: '',
  last_status: 'idle',
};

export const backupSettingsDefaults: BackupSettings = {
  local_device_enabled: false,
  local_device_path: '',
  auto_on_stop: true,
  retention_count: 30,
  destination_schedules: {
    project: { ...defaultSchedule, enabled: true },
    local_device: { ...defaultSchedule },
    gdrive: { ...defaultSchedule },
    s3: { ...defaultSchedule },
  },
};

export function normalizeSchedule(input?: Partial<DestinationSchedule>): DestinationSchedule {
  const dayOfWeek = Number(input?.day_of_week ?? defaultSchedule.day_of_week);
  const dayOfMonth = Number(input?.day_of_month ?? defaultSchedule.day_of_month);
  return {
    enabled: Boolean(input?.enabled ?? defaultSchedule.enabled),
    frequency: (input?.frequency === 'weekly' || input?.frequency === 'monthly' || input?.frequency === 'daily')
      ? input.frequency
      : defaultSchedule.frequency,
    time: typeof input?.time === 'string' && input.time ? input.time : defaultSchedule.time,
    day_of_week: Number.isInteger(dayOfWeek) ? Math.min(6, Math.max(0, dayOfWeek)) : defaultSchedule.day_of_week,
    day_of_month: Number.isInteger(dayOfMonth) ? Math.min(28, Math.max(1, dayOfMonth)) : defaultSchedule.day_of_month,
    last_run_at: typeof input?.last_run_at === 'string' ? input.last_run_at : defaultSchedule.last_run_at,
    last_status: (input?.last_status === 'success' || input?.last_status === 'error' || input?.last_status === 'idle')
      ? input.last_status
      : defaultSchedule.last_status,
  };
}

export function normalizeBackupSettings(raw?: Partial<BackupSettings>): BackupSettings {
  return {
    ...backupSettingsDefaults,
    ...(raw ?? {}),
    destination_schedules: {
      project: normalizeSchedule(raw?.destination_schedules?.project ?? backupSettingsDefaults.destination_schedules.project),
      local_device: normalizeSchedule(raw?.destination_schedules?.local_device ?? backupSettingsDefaults.destination_schedules.local_device),
      gdrive: normalizeSchedule(raw?.destination_schedules?.gdrive ?? backupSettingsDefaults.destination_schedules.gdrive),
      s3: normalizeSchedule(raw?.destination_schedules?.s3 ?? backupSettingsDefaults.destination_schedules.s3),
    },
  };
}

export async function loadBackupSettings(): Promise<BackupSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', BACKUP_SETTINGS_KEY)
    .single();

  return normalizeBackupSettings((data?.value ?? {}) as Partial<BackupSettings>);
}
