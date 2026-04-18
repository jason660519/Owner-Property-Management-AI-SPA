'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Settings as SettingsIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PeopleDatabaseImportWorkspace } from './import/page';
import { PeopleDatabaseSearchWorkspace } from './search/page';

interface Stats {
  total_records: number | null;
  total_sources: number | null;
  avg_quality_score: number | null;
  indexed_records: number | null;
}

function formatQualityScore(score: number | null): string {
  if (score === null) return '—';
  const normalized = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${normalized}`;
}

export default function PeopleDatabasePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'search'>('import');

  useEffect(() => {
    fetch('/api/people-db/stats')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Stats) => setStats(d))
      .catch(() => null);
  }, []);

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ---- Title ---- */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">尋人資料庫</h1>
              <p className="text-text-secondary">人員資料管理、搜尋與品質監控</p>
            </div>
          </div>
          <Link
            href="/superadmin/settings/people-database/sources"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          >
            <SettingsIcon className="h-4 w-4" />
            資料來源管理
          </Link>
        </div>

        {/* ---- Stats ---- */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '總筆數', value: stats.total_records?.toLocaleString() ?? '—' },
              { label: '已索引', value: stats.indexed_records?.toLocaleString() ?? '—' },
              { label: '資料來源', value: stats.total_sources?.toLocaleString() ?? '—' },
              { label: '平均品質', value: formatQualityScore(stats.avg_quality_score) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                  <p className="text-xs text-text-secondary mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">工作區</CardTitle>
            <CardDescription>在同一頁完成 people-db 匯入與搜尋，不需切換到其他頁面。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  activeTab === 'import'
                    ? 'border-border-default bg-bg-secondary text-text-primary'
                    : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                匯入資料
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  activeTab === 'search'
                    ? 'border-border-default bg-bg-secondary text-text-primary'
                    : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                搜尋資料
              </button>
            </div>

            <div className="rounded-lg border border-border-default bg-bg-primary p-4">
              {activeTab === 'import' ? <PeopleDatabaseImportWorkspace /> : <PeopleDatabaseSearchWorkspace />}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
