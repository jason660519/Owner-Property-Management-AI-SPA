// filepath: apps/superadmin/app/superadmin/settings/backup/page.tsx
// created: 2026-04-06 | creator: Claude Sonnet 4.6
'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import {
  HardDrive, ShieldCheck, ShieldAlert, Download, RotateCcw, Trash2,
  RefreshCw, Plus, Loader2, CheckCircle, XCircle, FolderOpen, AlertTriangle,
  Usb, Cloud, ChevronRight, ArrowLeft, X, Folder,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BackupStats {
  table_count: number;
  total_rows: number;
  tables: Record<string, number>;
  storage_files: number;
  storage_files_size: number;
  storage_files_errors: number;
  // v1 compat
  property_photos?: number;
  property_documents?: number;
  storage_objects?: number;
}
interface BackupItem {
  id: string;
  filename: string;
  size: number;
  created_at: string;
  trigger: string;
  stats: BackupStats;
}
interface HealthData {
  healthy: boolean;
  property_photos: { db: number; storage: number; mismatch: boolean };
  property_documents: { db: number; storage: number; mismatch: boolean };
  backup_count: number;
  latest_backup: { id: string; created_at: string; stats: BackupStats } | null;
}
interface BackupRunLogRow {
  id: string;
  trigger: string;
  destinations: unknown;
  backup_id: string | null;
  filename: string | null;
  success: boolean;
  error_message: string | null;
  stats: BackupStats | null;
  cloud_result?: {
    gdrive?: { success: boolean; error?: string };
    s3?: { success: boolean; error?: string };
  } | null;
  duration_ms: number | null;
  created_at: string;
}
interface BackupSettings {
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

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
type ScheduleStatus = 'idle' | 'success' | 'error';
type DestinationKey = 'project' | 'local_device' | 'gdrive' | 's3';

interface DestinationSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string;
  day_of_week: number;
  day_of_month: number;
  last_run_at: string;
  last_status: ScheduleStatus;
}

const defaultSchedule: DestinationSchedule = {
  enabled: false,
  frequency: 'daily',
  time: '02:00',
  day_of_week: 1,
  day_of_month: 1,
  last_run_at: '',
  last_status: 'idle',
};

const dayOptions = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function triggerLabel(t: string) {
  return t === 'auto_stop' ? '停機自動' : t === 'auto_schedule' ? '排程自動' : '手動';
}

function destLabel(key: string): string {
  const m: Record<string, string> = {
    project: '專案目錄',
    local_device: '本地設備',
    gdrive: 'Google Drive',
    s3: 'AWS S3',
  };
  return m[key] ?? key;
}

function formatDestinations(destinations: unknown): string {
  if (!Array.isArray(destinations)) return '—';
  return destinations.map((d) => destLabel(String(d))).join('、');
}

function formatCloudResult(cloudResult?: BackupRunLogRow['cloud_result']): string {
  if (!cloudResult) return '—';
  const parts: string[] = [];
  if (cloudResult.gdrive) {
    parts.push(cloudResult.gdrive.success ? 'Drive: 成功' : `Drive: 失敗${cloudResult.gdrive.error ? ` (${cloudResult.gdrive.error})` : ''}`);
  }
  if (cloudResult.s3) {
    parts.push(cloudResult.s3.success ? 'S3: 成功' : `S3: 失敗${cloudResult.s3.error ? ` (${cloudResult.s3.error})` : ''}`);
  }
  return parts.length > 0 ? parts.join('；') : '—';
}

function normalizeSchedule(input?: Partial<DestinationSchedule>): DestinationSchedule {
  const dayOfWeek = Number(input?.day_of_week ?? defaultSchedule.day_of_week);
  const dayOfMonth = Number(input?.day_of_month ?? defaultSchedule.day_of_month);
  return {
    enabled: Boolean(input?.enabled ?? defaultSchedule.enabled),
    frequency: input?.frequency === 'weekly' || input?.frequency === 'monthly' || input?.frequency === 'daily'
      ? input.frequency
      : defaultSchedule.frequency,
    time: typeof input?.time === 'string' && input.time ? input.time : defaultSchedule.time,
    day_of_week: Number.isInteger(dayOfWeek) ? Math.min(6, Math.max(0, dayOfWeek)) : defaultSchedule.day_of_week,
    day_of_month: Number.isInteger(dayOfMonth) ? Math.min(28, Math.max(1, dayOfMonth)) : defaultSchedule.day_of_month,
    last_run_at: typeof input?.last_run_at === 'string' ? input.last_run_at : defaultSchedule.last_run_at,
    last_status: input?.last_status === 'success' || input?.last_status === 'error' || input?.last_status === 'idle'
      ? input.last_status
      : defaultSchedule.last_status,
  };
}

function getNextRun(schedule: DestinationSchedule, now = new Date()) {
  const [hRaw, mRaw] = schedule.time.split(':');
  const hours = Number.parseInt(hRaw ?? '0', 10);
  const minutes = Number.parseInt(mRaw ?? '0', 10);
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);

  if (schedule.frequency === 'daily') {
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (schedule.frequency === 'weekly') {
    const delta = (schedule.day_of_week - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }

  candidate.setDate(Math.min(28, Math.max(1, schedule.day_of_month)));
  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

// ── Health Banner ──────────────────────────────────────────────────────────────
function HealthBanner({ health, onRefresh }: { health: HealthData | null; onRefresh: () => void }) {
  if (!health) return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border-default bg-bg-secondary animate-pulse">
      <Loader2 size={16} className="animate-spin text-text-muted" />
      <span className="text-sm text-text-muted">檢查儲存健康狀態...</span>
    </div>
  );

  const bg = health.healthy ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5';
  const Icon = health.healthy ? ShieldCheck : ShieldAlert;
  const iconColor = health.healthy ? 'text-green-500' : 'text-yellow-500';

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${health.healthy ? 'text-green-600' : 'text-yellow-600'}`}>
            {health.healthy ? '儲存狀態正常' : '偵測到資料不一致'}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary">
            <span>照片 DB 記錄：{health.property_photos.db} 筆
              {health.property_photos.mismatch && <span className="text-yellow-500 ml-1">(Storage: {health.property_photos.storage})</span>}
            </span>
            <span>文件 DB 記錄：{health.property_documents.db} 筆
              {health.property_documents.mismatch && <span className="text-yellow-500 ml-1">(Storage: {health.property_documents.storage})</span>}
            </span>
            <span>可用備份數：{health.backup_count} 個</span>
            {health.latest_backup && (
              <span>最新備份：{fmtDate(health.latest_backup.created_at)}</span>
            )}
          </div>
          {!health.healthy && (
            <p className="mt-2 text-xs text-yellow-600">
              storage.objects 與 DB 記錄不符，建議從最新備份還原，或重新上傳照片。
            </p>
          )}
        </div>
        <button onClick={onRefresh} className="shrink-0 p-1.5 rounded-md hover:bg-bg-tertiary transition-colors">
          <RefreshCw size={14} className="text-text-muted" />
        </button>
      </div>
    </div>
  );
}

// ── Backup History Table ────────────────────────────────────────────────────────
function BackupRunLogsTable({ logs }: { logs: BackupRunLogRow[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        尚無執行記錄（手動備份或排程觸發後會顯示）
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default text-xs text-text-muted">
            <th className="text-left py-2 pr-4 font-medium">時間</th>
            <th className="text-left py-2 pr-4 font-medium">來源</th>
            <th className="text-left py-2 pr-4 font-medium">目的地</th>
            <th className="text-left py-2 pr-4 font-medium">結果</th>
            <th className="text-left py-2 pr-4 font-medium">雲端摘要</th>
            <th className="text-right py-2 font-medium">耗時</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {logs.map((row) => (
            <tr key={row.id} className="hover:bg-bg-secondary/50 transition-colors align-top">
              <td className="py-2.5 pr-4 text-text-primary text-xs whitespace-nowrap">
                {fmtDate(row.created_at)}
              </td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs">{triggerLabel(row.trigger)}</td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs max-w-[200px]">
                {formatDestinations(row.destinations)}
              </td>
              <td className="py-2.5 pr-4 text-xs">
                {row.success ? (
                  <span className="text-green-600">
                    成功
                    {row.stats && (
                      <span className="text-text-muted ml-1">
                        （{row.stats.table_count ?? '?'} 表 ／ {row.stats.total_rows ?? '?'} 筆 ／ Storage {row.stats.storage_files ?? row.stats.storage_objects ?? 0}）
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-red-600 break-words">
                    {row.error_message ?? '失敗'}
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-4 text-xs text-text-secondary max-w-[260px] break-words">
                {formatCloudResult(row.cloud_result)}
              </td>
              <td className="py-2.5 text-right text-text-muted text-xs whitespace-nowrap">
                {row.duration_ms != null ? `${row.duration_ms} ms` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BackupTable({
  backups, onRestore, onDownload, onDelete, restoringId,
}: {
  backups: BackupItem[];
  onRestore: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  restoringId: string | null;
}) {
  if (backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <HardDrive size={32} className="mb-3 opacity-30" />
        <p className="text-sm">尚無備份記錄</p>
        <p className="text-xs mt-1">點擊「立即備份」建立第一份備份</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default text-xs text-text-muted">
            <th className="text-left py-2 pr-4 font-medium">建立時間</th>
            <th className="text-left py-2 pr-4 font-medium">來源</th>
            <th className="text-right py-2 pr-4 font-medium">表數</th>
            <th className="text-right py-2 pr-4 font-medium">資料筆數</th>
            <th className="text-right py-2 pr-4 font-medium">大小</th>
            <th className="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {backups.map((b, i) => (
            <tr key={b.id} className="hover:bg-bg-secondary/50 transition-colors">
              <td className="py-2.5 pr-4 text-text-primary font-mono text-xs whitespace-nowrap">
                {fmtDate(b.created_at)}
                {i === 0 && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded font-sans">最新</span>}
              </td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs">{triggerLabel(b.trigger)}</td>
              <td className="py-2.5 pr-4 text-right text-text-secondary">{b.stats?.table_count ?? '—'}</td>
              <td className="py-2.5 pr-4 text-right text-text-secondary">{b.stats?.total_rows ?? '—'}</td>
              <td className="py-2.5 pr-4 text-right text-text-muted text-xs">{fmtBytes(b.size)}</td>
              <td className="py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onRestore(b.id)}
                    disabled={restoringId === b.id}
                    title="還原此備份"
                    className="p-1.5 rounded hover:bg-green-500/10 text-text-muted hover:text-green-500 transition-colors disabled:opacity-50"
                  >
                    {restoringId === b.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  </button>
                  <button onClick={() => onDownload(b.id)} title="下載備份檔" className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors">
                    <Download size={14} />
                  </button>
                  <button onClick={() => onDelete(b.id)} title="刪除備份" className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Cloud config types for backup page ─────────────────────────────────────────
interface CloudConfigMasked {
  gdrive: { enabled: boolean; folder_id: string; configured: boolean };
  s3: { enabled: boolean; bucket: string; region: string; access_key_id: string; prefix: string; configured: boolean };
}

// ── Folder Picker Modal ───────────────────────────────────────────────────────
interface DirEntry { name: string; path: string }

function FolderPickerModal({
  open, currentPath, onSelect, onClose,
}: {
  open: boolean;
  currentPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [browsePath, setBrowsePath] = useState('');
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setBrowsePath(currentPath || '');
  }, [open, currentPath]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = browsePath ? `?path=${encodeURIComponent(browsePath)}` : '';
    fetch(`/api/backup/browse-dirs${params}`)
      .then((r) => r.json())
      .then((data: { dirs: DirEntry[] }) => setDirs(data.dirs))
      .catch(() => setDirs([]))
      .finally(() => setLoading(false));
  }, [open, browsePath]);

  if (!open) return null;

  const pathParts = browsePath.split('/').filter(Boolean);
  const canGoUp = browsePath.length > 0;

  function goUp() {
    if (!canGoUp) return;
    const parts = browsePath.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    setBrowsePath(parts.length ? '/' + parts.join('/') : '');
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-bg-primary border border-border-default rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary">選擇備份目的地</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-tertiary text-text-muted">
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb / current path */}
        <div className="px-4 py-2 border-b border-border-default bg-bg-secondary/50 flex items-center gap-2 min-h-[40px]">
          <button
            onClick={goUp}
            disabled={!canGoUp}
            className="p-1 rounded hover:bg-bg-tertiary text-text-muted disabled:opacity-30 shrink-0"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-0.5 text-xs text-text-secondary overflow-x-auto">
            <button
              onClick={() => setBrowsePath('')}
              className="hover:text-accent shrink-0"
            >
              磁碟
            </button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-0.5 shrink-0">
                <ChevronRight size={10} className="text-text-muted" />
                <button
                  onClick={() => setBrowsePath('/' + pathParts.slice(0, i + 1).join('/'))}
                  className="hover:text-accent"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          ) : dirs.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">此目錄下沒有子資料夾</p>
          ) : (
            <div className="space-y-0.5">
              {dirs.map((d) => (
                <button
                  key={d.path}
                  onClick={() => setBrowsePath(d.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-bg-secondary transition-colors group"
                >
                  <Folder size={16} className="text-accent/70 shrink-0" />
                  <span className="text-sm text-text-primary truncate">{d.name}</span>
                  <ChevronRight size={14} className="text-text-muted ml-auto opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-default flex items-center justify-between gap-3">
          <div className="text-xs text-text-muted truncate flex-1 font-mono">
            {browsePath || '（請選擇資料夾）'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-tertiary"
            >
              取消
            </button>
            <button
              onClick={() => { onSelect(browsePath); onClose(); }}
              disabled={!browsePath}
              className="px-3 py-1.5 text-xs bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50"
            >
              選擇此資料夾
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toggle Component ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="sr-only peer" disabled={disabled} checked={checked}
        onChange={(e) => onChange(e.target.checked)} />
      <div className="w-9 h-5 bg-bg-tertiary peer-focus:ring-1 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-default" />
    </label>
  );
}

// ── Inline select style ───────────────────────────────────────────────────────
const cellSelect = 'px-2 py-1.5 text-xs bg-bg-secondary border border-border-default rounded-md text-text-primary disabled:opacity-40 w-full';
const cellInput = 'px-2 py-1.5 text-xs bg-bg-secondary border border-border-default rounded-md text-text-primary disabled:opacity-40 w-full';

// ── Destination row metadata ──────────────────────────────────────────────────
interface DestRow {
  key: DestinationKey;
  label: string;
  icon: React.ReactNode;
  alwaysOn?: boolean;
}

// ── Destination Config (Table) ────────────────────────────────────────────────
function DestinationConfig({
  settings,
  onSave,
  isCreating,
  creatingDest,
  hasBackups,
  latestBackupId,
  onCreate,
  onDownloadLatest,
  onRefresh,
}: {
  settings: BackupSettings;
  onSave: (s: BackupSettings) => void;
  isCreating: boolean;
  hasBackups: boolean;
  latestBackupId: string | null;
  onCreate: (destination?: DestinationKey) => void;
  creatingDest: DestinationKey | null;
  onDownloadLatest: (id: string) => void;
  onRefresh: () => void;
}) {
  const [local, setLocal] = useState(settings);
  const [isPending, start] = useTransition();
  const [cloud, setCloud] = useState<CloudConfigMasked | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  useEffect(() => {
    setLocal({
      ...settings,
      destination_schedules: {
        project: normalizeSchedule(settings.destination_schedules?.project),
        local_device: normalizeSchedule(settings.destination_schedules?.local_device),
        gdrive: normalizeSchedule(settings.destination_schedules?.gdrive),
        s3: normalizeSchedule(settings.destination_schedules?.s3),
      },
    });
  }, [settings]);

  useEffect(() => {
    fetch('/api/backup/cloud-settings')
      .then((r) => r.json())
      .then((data: CloudConfigMasked) => setCloud(data))
      .catch(() => {/* ignore */});
  }, []);

  function handleSave() {
    start(async () => {
      await fetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      });
      if (cloud) {
        await fetch('/api/backup/cloud-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gdrive: { enabled: cloud.gdrive.enabled },
            s3: { enabled: cloud.s3.enabled },
          }),
        });
      }
      onSave(local);
    });
  }

  function updateSchedule(key: DestinationKey, patch: Partial<DestinationSchedule>) {
    setLocal((prev) => ({
      ...prev,
      destination_schedules: {
        ...prev.destination_schedules,
        [key]: normalizeSchedule({ ...prev.destination_schedules[key], ...patch }),
      },
    }));
  }

  // Whether a destination can be toggled / scheduled
  function isDestEnabled(key: DestinationKey): boolean {
    if (key === 'project') return true;
    if (key === 'local_device') return local.local_device_enabled;
    if (key === 'gdrive') return Boolean(cloud?.gdrive.enabled && cloud?.gdrive.configured);
    if (key === 's3') return Boolean(cloud?.s3.enabled && cloud?.s3.configured);
    return false;
  }

  function isDestConfigured(key: DestinationKey): boolean {
    if (key === 'project' || key === 'local_device') return true;
    if (key === 'gdrive') return Boolean(cloud?.gdrive.configured);
    if (key === 's3') return Boolean(cloud?.s3.configured);
    return false;
  }

  function handleDestToggle(key: DestinationKey, value: boolean) {
    if (key === 'local_device') {
      setLocal((p) => ({ ...p, local_device_enabled: value }));
    } else if (key === 'gdrive') {
      setCloud((prev) => prev ? { ...prev, gdrive: { ...prev.gdrive, enabled: value } } : prev);
    } else if (key === 's3') {
      setCloud((prev) => prev ? { ...prev, s3: { ...prev.s3, enabled: value } } : prev);
    }
  }

  function getDestChecked(key: DestinationKey): boolean {
    if (key === 'project') return true;
    if (key === 'local_device') return local.local_device_enabled;
    if (key === 'gdrive') return cloud?.gdrive.enabled ?? false;
    if (key === 's3') return cloud?.s3.enabled ?? false;
    return false;
  }

  function getDestSubtitle(key: DestinationKey): React.ReactNode {
    if (key === 'project') return <span className="text-text-muted">apps/superadmin/backups/</span>;
    if (key === 'local_device') {
      return (
        <button
          onClick={() => setFolderPickerOpen(true)}
          className="mt-0.5 inline-flex items-center gap-1.5 px-2 py-1 text-[11px] border border-border-default rounded-md hover:bg-bg-tertiary transition-colors text-left max-w-[200px]"
        >
          <FolderOpen size={12} className="text-accent shrink-0" />
          <span className="truncate font-mono text-text-secondary">
            {local.local_device_path || '選擇資料夾...'}
          </span>
        </button>
      );
    }
    if (key === 'gdrive') {
      if (!cloud?.gdrive.configured) return <a href="/superadmin/settings/integrations" className="text-yellow-600 hover:underline">前往設定金鑰</a>;
      return <span className="text-text-muted">{cloud.gdrive.folder_id ? `資料夾 ${cloud.gdrive.folder_id}` : 'Service Account 根目錄'}</span>;
    }
    if (key === 's3') {
      if (!cloud?.s3.configured) return <a href="/superadmin/settings/integrations" className="text-yellow-600 hover:underline">前往設定金鑰</a>;
      return <span className="text-text-muted font-mono">s3://{cloud.s3.bucket}/{cloud.s3.prefix}</span>;
    }
    return null;
  }

  const rows: DestRow[] = [
    { key: 'project', label: '專案目錄', icon: <FolderOpen size={14} className="text-accent" />, alwaysOn: true },
    { key: 'local_device', label: '本地設備', icon: <Usb size={14} className="text-blue-500" /> },
    { key: 'gdrive', label: 'Google Drive', icon: <Cloud size={14} className="text-[#4285f4]" /> },
    { key: 's3', label: 'AWS S3', icon: <HardDrive size={14} className="text-[#ff9900]" /> },
  ];

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 bg-bg-secondary border-b border-border-default flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary">排程總覽</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onCreate()}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            立即備份
          </button>
          {hasBackups && latestBackupId && (
            <button
              onClick={() => onDownloadLatest(latestBackupId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default text-text-secondary text-xs font-medium rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <Download size={13} />
              下載最新
            </button>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-xs text-text-muted bg-bg-secondary/50">
              <th className="text-left py-2.5 pl-5 pr-3 font-medium w-[160px]">目的地</th>
              <th className="text-center py-2.5 px-2 font-medium w-[60px]">啟用</th>
              <th className="text-center py-2.5 px-2 font-medium w-[60px]">排程</th>
              <th className="text-left py-2.5 px-2 font-medium w-[90px]">頻率</th>
              <th className="text-left py-2.5 px-2 font-medium w-[80px]">時間</th>
              <th className="text-left py-2.5 px-2 font-medium w-[100px]">週期日</th>
              <th className="text-left py-2.5 px-2 font-medium w-[130px]">下次執行</th>
              <th className="text-center py-2.5 px-2 font-medium w-[50px]">狀態</th>
              <th className="text-center py-2.5 px-2 pr-5 font-medium w-[80px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row) => {
              const enabled = isDestEnabled(row.key);
              const configured = isDestConfigured(row.key);
              const schedule = normalizeSchedule(local.destination_schedules?.[row.key]);
              const scheduleOn = enabled && schedule.enabled;
              const nextRun = getNextRun(schedule);
              const rowDisabled = !configured && row.key !== 'project' && row.key !== 'local_device';

              return (
                <tr key={row.key} className={`hover:bg-bg-secondary/50 transition-colors ${rowDisabled ? 'opacity-50' : ''}`}>
                  {/* Destination name */}
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${enabled ? '' : 'bg-bg-tertiary'}`}>
                        {row.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-text-primary">{row.label}</span>
                          {row.alwaysOn && (
                            <span className="text-[9px] px-1 py-0.5 bg-green-500/10 text-green-500 rounded font-medium leading-none">常駐</span>
                          )}
                          {!row.alwaysOn && configured && (
                            <span className="text-[9px] px-1 py-0.5 bg-green-500/10 text-green-500 rounded font-medium leading-none">已設定</span>
                          )}
                        </div>
                        <div className="text-[11px] truncate max-w-[140px]">{getDestSubtitle(row.key)}</div>
                      </div>
                    </div>
                  </td>

                  {/* Enable toggle */}
                  <td className="py-3 px-2 text-center">
                    {row.alwaysOn ? (
                      <CheckCircle size={16} className="text-green-500 mx-auto" />
                    ) : (
                      <Toggle
                        checked={getDestChecked(row.key)}
                        onChange={(v) => handleDestToggle(row.key, v)}
                        disabled={!configured}
                      />
                    )}
                  </td>

                  {/* Schedule toggle */}
                  <td className="py-3 px-2 text-center">
                    <Toggle
                      checked={scheduleOn}
                      onChange={(v) => updateSchedule(row.key, { enabled: v })}
                      disabled={!enabled}
                    />
                  </td>

                  {/* Frequency */}
                  <td className="py-3 px-2">
                    <select
                      disabled={!scheduleOn}
                      value={schedule.frequency}
                      onChange={(e) => updateSchedule(row.key, { frequency: e.target.value as ScheduleFrequency })}
                      className={cellSelect}
                    >
                      <option value="daily">每日</option>
                      <option value="weekly">每週</option>
                      <option value="monthly">每月</option>
                    </select>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-2">
                    <input
                      type="time"
                      disabled={!scheduleOn}
                      value={schedule.time}
                      onChange={(e) => updateSchedule(row.key, { time: e.target.value })}
                      className={cellInput}
                    />
                  </td>

                  {/* Day of week / month */}
                  <td className="py-3 px-2">
                    {schedule.frequency === 'weekly' ? (
                      <select
                        disabled={!scheduleOn}
                        value={schedule.day_of_week}
                        onChange={(e) => updateSchedule(row.key, { day_of_week: Number(e.target.value) })}
                        className={cellSelect}
                      >
                        {dayOptions.map((day, idx) => (
                          <option key={day} value={idx}>{day}</option>
                        ))}
                      </select>
                    ) : schedule.frequency === 'monthly' ? (
                      <select
                        disabled={!scheduleOn}
                        value={schedule.day_of_month}
                        onChange={(e) => updateSchedule(row.key, { day_of_month: Number(e.target.value) })}
                        className={cellSelect}
                      >
                        {Array.from({ length: 28 }).map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>{idx + 1} 日</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-text-muted px-2">—</span>
                    )}
                  </td>

                  {/* Next run */}
                  <td className="py-3 px-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {scheduleOn ? fmtDate(nextRun.toISOString()) : '—'}
                    </span>
                  </td>

                  {/* Last status */}
                  <td className="py-3 px-2 text-center">
                    {schedule.last_status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                        <CheckCircle size={12} /> 成功
                      </span>
                    ) : schedule.last_status === 'error' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <XCircle size={12} /> 錯誤
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted">待命</span>
                    )}
                  </td>

                  {/* Manual backup */}
                  <td className="py-3 px-2 pr-5 text-center">
                    <button
                      onClick={() => onCreate(row.key)}
                      disabled={!enabled || creatingDest === row.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {creatingDest === row.key ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                      備份
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Additional settings below table */}
      <div className="px-5 py-4 border-t border-border-default space-y-4">
        {/* Auto on stop */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">停止 Supabase 前自動備份</p>
            <p className="text-xs text-text-muted mt-0.5">執行 stop.sh 停止 Docker 時自動觸發</p>
          </div>
          <Toggle checked={local.auto_on_stop} onChange={(v) => setLocal((p) => ({ ...p, auto_on_stop: v }))} />
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            儲存設定
          </button>
        </div>
      </div>

      {/* Folder Picker Modal */}
      <FolderPickerModal
        open={folderPickerOpen}
        currentPath={local.local_device_path}
        onSelect={(path) => setLocal((p) => ({ ...p, local_device_path: path }))}
        onClose={() => setFolderPickerOpen(false)}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BackupPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    local_device_enabled: false, local_device_path: '', auto_on_stop: true, retention_count: 30,
    destination_schedules: {
      project: { ...defaultSchedule, enabled: true },
      local_device: { ...defaultSchedule },
      gdrive: { ...defaultSchedule },
      s3: { ...defaultSchedule },
    },
  });
  const [isCreating, setIsCreating] = useState(false);
  const [creatingDest, setCreatingDest] = useState<DestinationKey | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<BackupRunLogRow[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: {
      destinations?: string[];
      tableCount?: number;
      totalRows?: number;
      storageFiles?: number;
      storageFilesSize?: number;
      storageFilesErrors?: number;
      durationMs?: number;
      backupId?: string;
      localDevicePath?: string;
      changedTables?: Array<[string, number]>;
    };
  } | null>(null);
  const [, startTransition] = useTransition();

  const loadHealth = useCallback(async () => {
    setHealth(null);
    const res = await fetch('/api/backup/health');
    if (res.ok) setHealth(await res.json());
  }, []);

  const loadBackups = useCallback(async () => {
    const res = await fetch('/api/backup');
    if (res.ok) {
      const data = await res.json() as { backups: BackupItem[] };
      setBackups(data.backups);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/backup/settings');
    if (res.ok) {
      const data = (await res.json()) as BackupSettings;
      setSettings({
        ...data,
        destination_schedules: {
          project: normalizeSchedule(data.destination_schedules?.project),
          local_device: normalizeSchedule(data.destination_schedules?.local_device),
          gdrive: normalizeSchedule(data.destination_schedules?.gdrive),
          s3: normalizeSchedule(data.destination_schedules?.s3),
        },
      });
    }
  }, []);

  const loadRunLogs = useCallback(async () => {
    const res = await fetch('/api/backup/run-logs');
    if (res.ok) {
      const data = await res.json() as { logs: BackupRunLogRow[] };
      setRunLogs(data.logs);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadBackups();
    loadSettings();
    loadRunLogs();
  }, [loadHealth, loadBackups, loadSettings, loadRunLogs]);

  function showFeedback(type: 'success' | 'error' | 'warning', message: string) {
    setFeedback({ type, message });
  }

  async function handleCreate(destination?: DestinationKey) {
    if (destination) setCreatingDest(destination);
    setIsCreating(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'manual',
          local_device_path: settings.local_device_enabled ? settings.local_device_path : '',
          ...(destination ? { destinations: [destination] } : {}),
        }),
      });
      const data = await res.json() as {
        success?: boolean; stats?: BackupStats; error?: string;
        filename?: string; destinations?: string[]; durationMs?: number;
      };
      if (!res.ok || !data.success || !data.stats) {
        showFeedback('error', typeof data.error === 'string' ? data.error : '備份失敗');
        await loadRunLogs();
        return;
      }
      const s = data.stats;
      const changedTables = s.tables
        ? Object.entries(s.tables).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
        : [];
      setFeedback({
        type: 'success',
        message: '備份完成',
        details: {
          destinations: data.destinations,
          tableCount: s.table_count,
          totalRows: s.total_rows,
          storageFiles: s.storage_files,
          storageFilesSize: s.storage_files_size,
          storageFilesErrors: s.storage_files_errors,
          durationMs: data.durationMs,
          backupId: data.filename?.replace('.json', ''),
          localDevicePath: settings.local_device_enabled ? settings.local_device_path : undefined,
          changedTables,
        },
      });
      await Promise.all([loadBackups(), loadHealth(), loadRunLogs()]);
    } catch {
      showFeedback('error', '備份請求失敗，請確認服務正常運行');
    } finally {
      setIsCreating(false);
      setCreatingDest(null);
    }
  }

  async function handleRestore(id: string) {
    if (!confirm(`確定要從此備份還原？\n（現有資料會保留，僅補回缺失的記錄）`)) return;
    setRestoringId(id);
    setFeedback(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json() as { success: boolean; restored: { tables_restored: number; total_rows: number; storage_objects: number; errors: string[] } };
      if (data.success || data.restored) {
        const r = data.restored;
        showFeedback(r.errors?.length ? 'warning' : 'success',
          `還原完成：${r.tables_restored} 張表、${r.total_rows} 筆資料、Storage ${r.storage_objects} 筆${r.errors?.length ? `（${r.errors.length} 個錯誤）` : ''}`
        );
        await loadHealth();
      }
    } catch {
      showFeedback('error', '還原失敗');
    } finally {
      setRestoringId(null);
    }
  }

  function handleDownload(id: string) {
    const a = document.createElement('a');
    a.href = `/api/backup/${id}`;
    a.download = `${id}.json`;
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這份備份？此操作不可恢復。')) return;
    startTransition(async () => {
      await fetch(`/api/backup/${id}`, { method: 'DELETE' });
      await loadBackups();
    });
  }

  const feedbackStyles = {
    success: { bg: 'bg-green-600', icon: <CheckCircle size={18} /> },
    error: { bg: 'bg-red-600', icon: <XCircle size={18} /> },
    warning: { bg: 'bg-yellow-600', icon: <AlertTriangle size={18} /> },
  };

  return (
    <>
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="資料備份管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: '資料備份管理' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <HardDrive size={22} />
            資料備份管理
          </h1>
          <p className="text-sm text-text-muted mt-1">
            保護照片、文件、Storage metadata，防止 DB 重置或意外刪除造成資料遺失
          </p>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            <strong>重要提醒：</strong>執行 <code className="bg-yellow-500/10 px-1 rounded">supabase db reset</code> 會清除所有 DB 記錄（照片、文件 metadata 全消失）。請先備份再 reset，或使用 <code className="bg-yellow-500/10 px-1 rounded">supabase migration up</code> 替代。
          </p>
        </div>

        {/* Health Check */}
        <HealthBanner health={health} onRefresh={loadHealth} />

        <DestinationConfig
          settings={settings}
          onSave={setSettings}
          isCreating={isCreating}
          creatingDest={creatingDest}
          hasBackups={backups.length > 0}
          latestBackupId={backups[0]?.id ?? null}
          onCreate={handleCreate}
          onDownloadLatest={handleDownload}
          onRefresh={() => { loadHealth(); loadBackups(); loadRunLogs(); }}
        />

        {/* Toast notification — fixed top-right */}
        {feedback && (
          <div className="fixed top-20 right-6 z-50 w-[360px]">
            <div className={`${feedbackStyles[feedback.type].bg} text-white rounded-xl shadow-2xl`} style={{ resize: 'both', overflow: 'auto', minWidth: 280, minHeight: 100, maxWidth: '80vw' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {feedbackStyles[feedback.type].icon}
                  <span className="text-sm font-semibold">
                    {feedback.type === 'success' ? '備份完成' : feedback.type === 'error' ? '備份失敗' : '備份警告'}
                  </span>
                </div>
                <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-white/20 transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2.5">
                {/* Simple message for errors */}
                {!feedback.details && (
                  <p className="text-xs opacity-90">{feedback.message}</p>
                )}

                {/* Structured report for success */}
                {feedback.details && (
                  <>
                    {/* Destination paths */}
                    {feedback.details.backupId && (
                      <div className="space-y-1.5 text-[11px]">
                        {feedback.details.destinations?.includes('project') && (
                          <div>
                            <span className="opacity-60">專案目錄</span>
                            <p className="font-mono opacity-80 break-all">backups/{feedback.details.backupId}/</p>
                          </div>
                        )}
                        {feedback.details.destinations?.includes('local_device') && feedback.details.localDevicePath && (
                          <div>
                            <span className="opacity-60">本地設備</span>
                            <p className="font-mono opacity-80 break-all">{feedback.details.localDevicePath}/{feedback.details.backupId}/</p>
                          </div>
                        )}
                        <div className="bg-white/10 rounded-md px-2.5 py-1.5 space-y-0.5 text-[10px] font-mono opacity-80">
                          <p>├── {feedback.details.backupId}.json <span className="opacity-60">（DB {feedback.details.tableCount} 張表）</span></p>
                          <p>└── files/</p>
                          <p>&nbsp;&nbsp;&nbsp;&nbsp;├── property-photos/ <span className="opacity-60">（照片）</span></p>
                          <p>&nbsp;&nbsp;&nbsp;&nbsp;└── property-documents/ <span className="opacity-60">（附件文檔）</span></p>
                        </div>
                      </div>
                    )}

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold">{feedback.details.tableCount} <span className="text-[10px] font-normal opacity-70">張表</span></p>
                      </div>
                      <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold">{feedback.details.totalRows?.toLocaleString()} <span className="text-[10px] font-normal opacity-70">筆資料</span></p>
                      </div>
                      <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold">{feedback.details.storageFiles} <span className="text-[10px] font-normal opacity-70">檔案</span></p>
                      </div>
                      <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold">{fmtBytes(feedback.details.storageFilesSize ?? 0)} <span className="text-[10px] font-normal opacity-70">檔案大小</span></p>
                      </div>
                    </div>

                    {/* Duration + errors */}
                    <div className="flex items-center gap-4">
                      {feedback.details.durationMs != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] opacity-60">耗時</span>
                          <span className="text-xs font-medium">{(feedback.details.durationMs / 1000).toFixed(1)} 秒</span>
                        </div>
                      )}
                      {(feedback.details.storageFilesErrors ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] opacity-60">檔案下載失敗</span>
                          <span className="text-xs font-medium text-yellow-200">{feedback.details.storageFilesErrors} 個</span>
                        </div>
                      )}
                    </div>

                    {/* Top changed tables */}
                    {feedback.details.changedTables && feedback.details.changedTables.length > 0 && (
                      <div>
                        <p className="text-[11px] opacity-60 mb-1">
                          有資料的表（{feedback.details.changedTables.length} 張）
                        </p>
                        <div className="flex flex-wrap gap-1 overflow-y-auto">
                          {feedback.details.changedTables.slice(0, 20).map(([table, count]) => (
                            <span key={table} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded text-[10px]">
                              {table} <span className="opacity-70">{count}</span>
                            </span>
                          ))}
                          {feedback.details.changedTables.length > 20 && (
                            <span className="text-[10px] opacity-60 px-1.5 py-0.5">
                              ...還有 {feedback.details.changedTables.length - 20} 張
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backup History */}
        <div className="border border-border-default rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-bg-secondary border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">備份歷史</h2>
            <span className="text-xs text-text-muted">{backups.length} 個備份</span>
          </div>
          <div className="px-5 py-4">
            <BackupTable
              backups={backups}
              onRestore={handleRestore}
              onDownload={handleDownload}
              onDelete={handleDelete}
              restoringId={restoringId}
            />
          </div>
        </div>

        {/* Execution audit log */}
        <div className="border border-border-default rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-bg-secondary border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">備份執行記錄</h2>
            <span className="text-xs text-text-muted">最近 50 筆</span>
          </div>
          <div className="px-5 py-4">
            <BackupRunLogsTable logs={runLogs} />
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-text-muted space-y-1 px-1">
          <p>• 備份檔存於 <code className="bg-bg-secondary px-1 rounded">apps/superadmin/backups/</code>，已加入 .gitignore</p>
          <p>• 備份內容：property_photos、property_documents、storage.objects metadata（不含實際檔案）</p>
          <p>• 還原操作為冪等（idempotent）—已存在的記錄不會被覆蓋，只補回缺失的</p>
          <p>• 實際的 Storage 檔案存於 Docker volume，重置 DB 後只需還原 metadata 即可重新存取</p>
        </div>
      </div>
    </DashboardLayout>
    </>
  );
}
