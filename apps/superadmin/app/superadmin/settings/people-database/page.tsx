'use client';

// Row 146 — Consolidated People Database workspace.
//
// Five tabs (匯入 / 搜尋 / 合併審核 / 監控 Ingest / 資料來源) live on a single
// route. Active tab is reflected in `?tab=` for deep linking; non-active tabs
// are lazy-loaded via next/dynamic to keep the initial bundle small.
//
// The legacy sub-routes (search/, import/, merge-candidates/, ingest/, sources/)
// remain reachable for backward compatibility — Sidebar (Step 2) is collapsed
// to point at this page only.

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Upload,
  Search as SearchIcon,
  GitMerge,
  Activity,
  FolderTree,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// Lazy-loaded workspaces — each ships only when its tab becomes active.
// ssr:false keeps the heavy 'use client' modules out of server rendering.
// ---------------------------------------------------------------------------

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" />
      載入「{label}」中…
    </div>
  );
}

const SearchWorkspace = dynamic(
  () =>
    import('./search/page').then((m) => ({
      default: m.PeopleDatabaseSearchWorkspace,
    })),
  { ssr: false, loading: () => <WorkspaceLoading label="搜尋" /> },
);

const ImportWorkspace = dynamic(
  () =>
    import('./import/page').then((m) => ({
      default: m.PeopleDatabaseImportWorkspace,
    })),
  { ssr: false, loading: () => <WorkspaceLoading label="匯入資料" /> },
);

const MergeCandidatesWorkspace = dynamic(
  () =>
    import('./merge-candidates/page').then((m) => ({
      default: m.MergeCandidatesWorkspace,
    })),
  { ssr: false, loading: () => <WorkspaceLoading label="合併審核" /> },
);

const IngestDashboardWorkspace = dynamic(
  () =>
    import('./ingest/page').then((m) => ({
      default: m.IngestDashboardWorkspace,
    })),
  { ssr: false, loading: () => <WorkspaceLoading label="Ingestion 監控" /> },
);

const SourcesWorkspace = dynamic(
  () => import('./sources/page').then((m) => ({ default: m.SourcesWorkspace })),
  { ssr: false, loading: () => <WorkspaceLoading label="資料來源" /> },
);

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'search', label: '搜尋', icon: SearchIcon },
  { id: 'import', label: '匯入', icon: Upload },
  { id: 'merge', label: '合併審核', icon: GitMerge },
  { id: 'ingest', label: '監控 Ingest', icon: Activity },
  { id: 'sources', label: '資料來源', icon: FolderTree },
] as const;

type TabId = (typeof TABS)[number]['id'];
const TAB_IDS: readonly TabId[] = TABS.map((t) => t.id);
const DEFAULT_TAB: TabId = 'search';

function isValidTab(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Stats summary (kept identical to the previous landing page)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PeopleDatabasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : DEFAULT_TAB;

  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/people-db/stats')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Stats) => setStats(d))
      .catch(() => null);
  }, []);

  const switchTab = useCallback(
    (next: TabId) => {
      if (next === activeTab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(
        `/superadmin/settings/people-database?${params.toString()}`,
        { scroll: false },
      );
    },
    [activeTab, router, searchParams],
  );

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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ---- Title ---- */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">尋人資料庫</h1>
            <p className="text-text-secondary">
              匯入、搜尋、品質監控與資料來源管理 — 全部集中在同一頁
            </p>
          </div>
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

        {/* ---- Tabs ---- */}
        <div
          role="tablist"
          aria-label="尋人資料庫工作區"
          className="flex flex-wrap gap-2 border-b border-border-default pb-2"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${t.id}`}
                onClick={() => switchTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ---- Active workspace ---- */}
        <div
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="rounded-lg border border-border-default bg-bg-primary p-4"
        >
          {activeTab === 'search' && <SearchWorkspace />}
          {activeTab === 'import' && <ImportWorkspace />}
          {activeTab === 'merge' && <MergeCandidatesWorkspace />}
          {activeTab === 'ingest' && <IngestDashboardWorkspace />}
          {activeTab === 'sources' && <SourcesWorkspace />}
        </div>
      </div>
    </DashboardLayout>
  );
}
