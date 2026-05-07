'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HardDrive, File, Trash2, AlertTriangle, PieChart, BarChart2, Activity } from 'lucide-react';
import {
  deleteFile,
  setUserQuota,
  batchDeleteFiles,
  type StorageSummary,
  type FileTypeStat,
  type OrphanedFile,
  type StorageQuota,
} from '@/app/actions/storage';
import { getQuotaUsagePercent, findQuotaAlerts } from '@/app/superadmin/dashboard/storage/storage-quota-utils';
import { useRouter } from 'next/navigation';
import { Loader2, CheckSquare, Square, Download, FolderInput } from 'lucide-react';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface Props {
  summary: StorageSummary;
  fileTypes: FileTypeStat[];
  initialOrphanedFiles: OrphanedFile[];
  quotas: StorageQuota[];
}

export default function StorageDashboardClient({ summary, fileTypes, initialOrphanedFiles, quotas }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orphaned' | 'quotas'>('overview');
  const [orphanedFiles, setOrphanedFiles] = useState(initialOrphanedFiles);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [savingQuotaFor, setSavingQuotaFor] = useState<string | null>(null);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const router = useRouter();

  // Find a global quota for total monitoring (optional, or just use 1GB as a benchmark)
  const GLOBAL_QUOTA_BYTES = 1024 * 1024 * 1024; // 1GB
  const globalUsagePercent = Math.min(100, (summary.totalSize / GLOBAL_QUOTA_BYTES) * 100);
  const isGlobalQuotaHigh = globalUsagePercent > 75;

  // Users with quota usage >= 75% — auto-alert
  const highQuotaUsers = findQuotaAlerts(quotas);

  const toggleSelectAll = () => {
    if (selectedOrphans.size === orphanedFiles.length) {
      setSelectedOrphans(new Set());
    } else {
      setSelectedOrphans(new Set(orphanedFiles.map(f => `${f.bucket_id}:${f.name}`)));
    }
  };

  const toggleSelect = (bucketId: string, name: string) => {
    const key = `${bucketId}:${name}`;
    const next = new Set(selectedOrphans);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedOrphans(next);
  };

  const handleBatchDelete = async () => {
    if (selectedOrphans.size === 0) return;
    if (!confirm(`確定要刪除選取的 ${selectedOrphans.size} 個孤兒檔案嗎？此操作無法復原。`)) return;

    setIsBatchDeleting(true);
    try {
      // Group by bucket
      const byBucket: Record<string, string[]> = {};
      selectedOrphans.forEach(key => {
        const [bucket, name] = key.split(':');
        if (!byBucket[bucket]) byBucket[bucket] = [];
        byBucket[bucket].push(name);
      });

      let totalDeleted = 0;
      for (const [bucket, paths] of Object.entries(byBucket)) {
        const result = await batchDeleteFiles(bucket, paths);
        totalDeleted += result.deleted;
      }

      alert(`已成功刪除 ${totalDeleted} 個檔案`);
      setOrphanedFiles(prev => prev.filter(f => !selectedOrphans.has(`${f.bucket_id}:${f.name}`)));
      setSelectedOrphans(new Set());
      router.refresh();
    } catch (error) {
      alert('批次刪除失敗');
      console.error(error);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDelete = async (bucket: string, path: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
    setDeleting(path);
    try {
      await deleteFile(bucket, path);
      setOrphanedFiles(prev => prev.filter(f => f.name !== path));
      router.refresh(); // Refresh stats
    } catch (error) {
      alert('Failed to delete file');
      console.error(error);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditQuota = async (quota: StorageQuota) => {
    const currentMb = quota.quota_mb || 0;
     
    const input = window.prompt('請輸入新的配額上限 (MB)：', currentMb.toString());
    if (!input) return;

    const parsed = Number.parseInt(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
       
      window.alert('請輸入大於 0 的數值');
      return;
    }

    setSavingQuotaFor(quota.user_id);
    try {
      await setUserQuota(quota.user_id, parsed);
       
      window.alert('配額已更新');
      router.refresh();
    } catch (error) {
      console.error(error);
       
      window.alert('更新配額時發生錯誤');
    } finally {
      setSavingQuotaFor(null);
    }
  };

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="雲端空間管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員', href: '/superadmin' },
        { label: '雲端空間管理' },
      ]}
    >
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border-default">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}
        >
          總覽與統計
        </button>
        <button
          onClick={() => setActiveTab('orphaned')}
          className={`pb-2 px-4 ${activeTab === 'orphaned' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}
        >
          孤兒檔案清理 ({orphanedFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`pb-2 px-4 ${activeTab === 'quotas' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}
        >
          用戶配額管理
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
            {/* Global Quota Alert */}
            {isGlobalQuotaHigh && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
                <div className="text-sm font-medium">
                  儲存空間警告：總體使用率已達 {globalUsagePercent.toFixed(1)}% ({formatBytes(summary.totalSize)} / {formatBytes(GLOBAL_QUOTA_BYTES)})
                </div>
              </div>
            )}

            {/* Per-user high-quota auto-alert */}
            {highQuotaUsers.length > 0 && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                  <p className="text-sm font-semibold text-orange-600">
                    {highQuotaUsers.length} 位用戶儲存配額超過 75% — 需要管理員關注
                  </p>
                </div>
                <ul className="space-y-1 pl-6">
                  {highQuotaUsers.map((q) => (
                    <li key={q.user_id} className="text-xs text-orange-700 font-mono">
                      {q.user_id.slice(0, 8)}… — 使用 {formatBytes((q.used_bytes ?? 0))} / {formatBytes((q.quota_mb ?? 1024) * 1024 * 1024)} ({(getQuotaUsagePercent(q) * 100).toFixed(1)}%)
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setActiveTab('quotas')}
                  className="mt-2 ml-6 text-xs text-orange-600 underline hover:text-orange-500"
                >
                  前往配額管理頁面 →
                </button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <HardDrive className="w-6 h-6 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-text-muted">總使用空間</p>
                                <h3 className="text-2xl font-bold">{formatBytes(summary.totalSize)}</h3>
                                <div className="mt-2 w-full bg-bg-tertiary rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all ${isGlobalQuotaHigh ? 'bg-red-500' : 'bg-accent'}`} 
                                    style={{ width: `${globalUsagePercent}%` }} 
                                  />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-full">
                                <File className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">總檔案數</p>
                                <h3 className="text-2xl font-bold">{summary.totalFiles.toLocaleString()}</h3>
                                <p className="text-xs text-text-muted mt-1">橫跨 {Object.keys(summary.byBucket).length} 個 Buckets</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">孤兒檔案 (前100筆)</p>
                                <h3 className="text-2xl font-bold">{initialOrphanedFiles.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            檔案類型分佈
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {fileTypes.map((ft) => (
                                <div key={ft.type} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="capitalize">{ft.type}</span>
                                        <span>{formatBytes(ft.size)} ({ft.count} files)</span>
                                    </div>
                                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-accent" 
                                            style={{ width: `${(ft.size / summary.totalSize) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5" />
                            Bucket 使用量
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                            {Object.entries(summary.byBucket).map(([name, stats]) => (
                                <div key={name} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>{name}</span>
                                        <span>{formatBytes(stats.size)}</span>
                                    </div>
                                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500" 
                                            style={{ width: `${summary.totalSize > 0 ? (stats.size / summary.totalSize) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                         CDN 流量監控
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-bg-secondary rounded text-center text-text-muted">
                        Supabase CDN 流量數據整合中 (需串接 Supabase Management API)
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {activeTab === 'orphaned' && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle>孤兒檔案列表 (未被資料庫參照)</CardTitle>
                    <p className="text-xs text-text-muted mt-1">這些檔案存在於 Storage 但在資料庫中找不到對應紀錄，建議清理以節省空間。</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedOrphans.size > 0 && (
                        <>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                orphanedFiles
                                  .filter(f => selectedOrphans.has(`${f.bucket_id}:${f.name}`))
                                  .forEach(f => window.open(f.url, '_blank'));
                              }}
                              className="text-text-muted hover:text-accent"
                          >
                              <Download className="w-4 h-4 mr-1.5" />
                              下載選取 ({selectedOrphans.size})
                          </Button>
                          <Button
                              variant="primary"
                              size="sm"
                              onClick={handleBatchDelete}
                              disabled={isBatchDeleting}
                              className="bg-red-600 hover:bg-red-700"
                          >
                              {isBatchDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                  <Trash2 className="w-4 h-4 mr-1.5" />
                              )}
                              刪除選取 ({selectedOrphans.size})
                          </Button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-text-muted border-b border-border-default">
                            <tr>
                                <th className="p-3 w-10">
                                    <button onClick={toggleSelectAll} className="text-text-muted hover:text-accent">
                                        {selectedOrphans.size === orphanedFiles.length && orphanedFiles.length > 0 ? (
                                            <CheckSquare className="w-4 h-4" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="p-3">Bucket</th>
                                <th className="p-3">檔案路徑</th>
                                <th className="p-3">大小</th>
                                <th className="p-3">建立時間</th>
                                <th className="p-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                            {orphanedFiles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-text-secondary italic">
                                        恭喜！目前沒有偵測到任何孤兒檔案。
                                    </td>
                                </tr>
                            ) : (
                                orphanedFiles.map((file) => {
                                    const isSelected = selectedOrphans.has(`${file.bucket_id}:${file.name}`);
                                    return (
                                        <tr key={`${file.bucket_id}:${file.name}`} className={`hover:bg-bg-tertiary/20 transition-colors ${isSelected ? 'bg-accent/5' : ''}`}>
                                            <td className="p-3">
                                                <button onClick={() => toggleSelect(file.bucket_id, file.name)} className="text-text-muted hover:text-accent">
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-[10px] font-medium uppercase">
                                                    {file.bucket_id}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-xs break-all max-w-md" title={file.name}>
                                                {file.name}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">{formatBytes(file.size)}</td>
                                            <td className="p-3 whitespace-nowrap text-text-muted text-xs">
                                                {new Date(file.created_at).toLocaleString('zh-TW')}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary transition-colors"
                                                        title="預覽"
                                                    >
                                                        <Activity className="w-4 h-4" />
                                                    </a>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDelete(file.bucket_id, file.name)}
                                                        disabled={deleting === file.name}
                                                        className="text-text-muted hover:text-red-500 hover:bg-red-500/10"
                                                    >
                                                        {deleting === file.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
      )}

      {activeTab === 'quotas' && (
        <Card>
          <CardHeader>
            <CardTitle>用戶配額管理</CardTitle>
          </CardHeader>
          <CardContent>
            {quotas.length === 0 ? (
              <div className="p-4 bg-bg-secondary rounded text-center text-text-muted">
                目前尚無任何配額紀錄。
                <p className="text-xs mt-2">預設配額：所有用戶 1GB，由後端排程同步實際使用量。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-text-muted border-b border-border-default">
                    <tr>
                      <th className="p-3">User ID</th>
                      <th className="p-3">已用空間 / 配額</th>
                      <th className="p-3">使用率</th>
                      <th className="p-3">最後更新</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {quotas.map((quota) => {
                      const usage = getQuotaUsagePercent(quota);
                      const percentLabel = `${(usage * 100).toFixed(1)}%`;
                      const isHigh = usage >= 0.75;
                      return (
                        <tr key={quota.user_id} className={isHigh ? 'bg-red-500/5' : undefined}>
                          <td className="p-3 font-mono text-xs max-w-xs truncate" title={quota.user_id}>
                            {quota.user_id}
                          </td>
                          <td className="p-3">
                            {formatBytes(quota.used_bytes)} / {formatBytes(quota.quota_mb * 1024 * 1024)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isHigh ? 'bg-red-500' : 'bg-accent'}`}
                                  style={{ width: `${Math.min(usage * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs ${isHigh ? 'text-red-500 font-semibold' : 'text-text-secondary'}`}>
                                {percentLabel}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {new Date(quota.updated_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuota(quota)}
                              disabled={savingQuotaFor === quota.user_id}
                            >
                              {savingQuotaFor === quota.user_id ? '儲存中…' : '編輯配額'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
