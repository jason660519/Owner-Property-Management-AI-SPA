'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HardDrive, File, Trash2, AlertTriangle, PieChart, BarChart2, Activity } from 'lucide-react';
import {
  deleteFile,
  setUserQuota,
  type StorageSummary,
  type FileTypeStat,
  type OrphanedFile,
  type StorageQuota,
} from '@/app/actions/storage';
import { getQuotaUsagePercent } from '@/app/superadmin/dashboard/storage/storage-quota-utils';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

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
    const currentGb = quota.quota_bytes / (1024 ** 3);
    // eslint-disable-next-line no-alert
    const input = window.prompt('請輸入新的配額上限 (GB)：', currentGb.toFixed(2));
    if (!input) return;

    const parsed = Number.parseFloat(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // eslint-disable-next-line no-alert
      window.alert('請輸入大於 0 的數值');
      return;
    }

    const newQuotaBytes = Math.round(parsed * 1024 ** 3);
    setSavingQuotaFor(quota.user_id);
    try {
      const result = await setUserQuota(quota.user_id, newQuotaBytes);
      if (!result.success) {
        // eslint-disable-next-line no-alert
        window.alert(result.error ?? '更新配額失敗');
        return;
      }
      // eslint-disable-next-line no-alert
      window.alert('配額已更新');
      router.refresh();
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line no-alert
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
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <HardDrive className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted">總使用空間</p>
                                <h3 className="text-2xl font-bold">{formatBytes(summary.total_size_bytes)}</h3>
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
                                <h3 className="text-2xl font-bold">{summary.total_files.toLocaleString()}</h3>
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
                                            style={{ width: `${(ft.size / summary.total_size_bytes) * 100}%` }}
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
                            {summary.buckets.map((b) => (
                                <div key={b.name} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>{b.name}</span>
                                        <span>{formatBytes(b.size)}</span>
                                    </div>
                                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500" 
                                            style={{ width: `${summary.total_size_bytes > 0 ? (b.size / summary.total_size_bytes) * 100 : 0}%` }}
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
            <CardHeader>
                <CardTitle>孤兒檔案列表 (未被資料庫參照)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-text-muted border-b border-border-default">
                            <tr>
                                <th className="p-3">Bucket</th>
                                <th className="p-3">檔案路徑</th>
                                <th className="p-3">大小</th>
                                <th className="p-3">建立時間</th>
                                <th className="p-3">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {orphanedFiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-text-secondary">
                                        無孤兒檔案
                                    </td>
                                </tr>
                            ) : (
                                orphanedFiles.map((file) => (
                                    <tr key={file.name}>
                                        <td className="p-3">{file.bucket_id}</td>
                                        <td className="p-3 font-mono text-xs">{file.name}</td>
                                        <td className="p-3">{formatBytes(file.size)}</td>
                                        <td className="p-3">{new Date(file.created_at).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <Button 
                                                variant="primary" 
                                                size="sm"
                                                onClick={() => handleDelete(file.bucket_id, file.name)}
                                                disabled={deleting === file.name}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {deleting === file.name ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
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
                        <tr key={quota.id} className={isHigh ? 'bg-red-500/5' : undefined}>
                          <td className="p-3 font-mono text-xs max-w-xs truncate" title={quota.user_id}>
                            {quota.user_id}
                          </td>
                          <td className="p-3">
                            {formatBytes(quota.used_bytes)} / {formatBytes(quota.quota_bytes)}
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
