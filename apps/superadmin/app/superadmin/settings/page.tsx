// filepath: apps/superadmin/app/superadmin/settings/page.tsx
// created: 2026-02-17 | Blacklist UI for IP / User-Agent blocking

'use client';

import React, { useEffect, useState } from 'react';
import { Settings, ShieldAlert, Plus, Trash2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  listBlacklist,
  addBlacklistEntry,
  removeBlacklistEntry,
  type BlacklistEntry,
  type BlacklistType,
} from './actions';

export default function SettingsPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlacklistType>('ip');
  const [addValue, setAddValue] = useState('');
  const [addReason, setAddReason] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBlacklist();
    if (err) setError(err);
    else if (data) setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSubmitting(true);
    const formData = new FormData();
    formData.set('type', addType);
    formData.set('value', addValue.trim());
    formData.set('reason', addReason.trim());
    const { error: err } = await addBlacklistEntry(formData);
    if (err) {
      setAddError(err);
      setAddSubmitting(false);
      return;
    }
    setAddValue('');
    setAddReason('');
    setAddSubmitting(false);
    await load();
  };

  const handleRemove = async (id: string) => {
    setDeletingId(id);
    await removeBlacklistEntry(id);
    setDeletingId(null);
    await load();
  };

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="設定"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定' },
      ]}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">一般設定</h1>
          <p className="text-sm text-text-muted mt-1">
            系統全域設定與偏好
          </p>
        </div>

        {/* 黑名單區塊 */}
        <Card variant="outlined" padding="lg" className="mb-8">
          <CardHeader className="flex flex-row items-start gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent-subtle text-accent">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">黑名單（防駭客／惡意爬蟲）</CardTitle>
              <CardDescription className="mt-1">
                封鎖特定 IP 或 User-Agent，被列入的請求將收到 403。支援 IP 完全比對、CIDR（如 192.168.0.0/24）與 User-Agent 關鍵字子字串。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-bg-tertiary border border-border-light">
              <div className="flex flex-col gap-1">
                <label htmlFor="blacklist-type" className="text-sm font-medium text-text-primary">
                  類型
                </label>
                <select
                  id="blacklist-type"
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as BlacklistType)}
                  className="h-10 min-w-[140px] rounded-md border border-border-default bg-bg-primary px-3 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="ip">IP 或 CIDR</option>
                  <option value="user_agent">User-Agent 關鍵字</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input
                  label={addType === 'ip' ? 'IP 或 CIDR' : 'User-Agent 關鍵字'}
                  placeholder={addType === 'ip' ? '例如 1.2.3.4 或 192.168.0.0/24' : '例如 bot、scraper'}
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Input
                  label="備註（選填）"
                  placeholder="例如：惡意爬蟲、攻擊來源"
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={addSubmitting || !addValue.trim()}
                isLoading={addSubmitting}
                leftIcon={!addSubmitting ? <Plus className="w-4 h-4" /> : undefined}
              >
                新增
              </Button>
            </form>
            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>載入中…</span>
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-text-muted">目前無黑名單項目</p>
            ) : (
              <div className="border border-border-default rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-tertiary border-b border-border-default">
                      <th className="text-left py-3 px-4 font-medium text-text-primary">類型</th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary">內容</th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary">備註</th>
                      <th className="w-[80px] py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border-light last:border-b-0 hover:bg-bg-tertiary/50"
                      >
                        <td className="py-3 px-4 text-text-secondary">
                          {entry.type === 'ip' ? 'IP / CIDR' : 'User-Agent'}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-primary break-all">
                          {entry.value}
                        </td>
                        <td className="py-3 px-4 text-text-muted">
                          {entry.reason || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(entry.id)}
                            disabled={deletingId === entry.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 其餘設定預留 */}
        <div className="bg-bg-secondary border border-border-default rounded-base p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-tertiary mb-4">
            <Settings className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">其他設定</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            AI 服務設定已移動至專屬頁面。更多一般系統設定功能即將推出。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
