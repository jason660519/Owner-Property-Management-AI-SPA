'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Users,
  Upload,
  Search as SearchIcon,
  FolderTree,
  Loader2,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

const SourcesWorkspace = dynamic(
  () => import('./sources/page').then((m) => ({ default: m.SourcesWorkspace })),
  { ssr: false, loading: () => <WorkspaceLoading label="資料來源" /> },
);

// ---------------------------------------------------------------------------
// Stats summary (kept identical to the previous landing page)
// ---------------------------------------------------------------------------

interface Stats {
  total_records: number | null;
  total_sources: number | null;
  avg_quality_score: number | null;
  indexed_records: number | null;
}

type SectionId = 'search' | 'import' | 'sources';

function formatQualityScore(score: number | null): string {
  if (score === null) return '—';
  const normalized = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${normalized}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PeopleDatabasePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionId | null>('search');

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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ---- Title ---- */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">尋人資料庫</h1>
              <p className="text-text-secondary">
                搜尋、匯入與資料來源管理已整合為單一工作頁
              </p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-accent/10">
            <Link
              href="/superadmin/docs?scope=project&path=apps%2Fsuperadmin%2Fdocs%2FPEOPLE_DATABASE_USER_GUIDE.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            >
              <BookOpen className="h-4 w-4" />
              使用說明
            </Link>
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

        {/* ---- Consolidated workspace nav ---- */}
        <div className="flex flex-wrap gap-2 border-b border-border-default pb-3">
          <button
            type="button"
            onClick={() => setExpandedSection('search')}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              expandedSection === 'search'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            <SearchIcon className="h-4 w-4" />
            搜尋
          </button>
          <button
            type="button"
            onClick={() => setExpandedSection('import')}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              expandedSection === 'import'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            <Upload className="h-4 w-4" />
            匯入
          </button>
          <button
            type="button"
            onClick={() => setExpandedSection('sources')}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              expandedSection === 'sources'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            <FolderTree className="h-4 w-4" />
            資料來源
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <a href="/superadmin/settings/people-database/merge-candidates">合併審核</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="/superadmin/settings/people-database/ingest">Ingest 監控</a>
            </Button>
          </div>
        </div>

        {/* ---- Merged sections ---- */}
        <section id="people-db-search" className="rounded-lg border border-border-default bg-bg-primary scroll-mt-24">
          <button
            type="button"
            onClick={() =>
              setExpandedSection((prev) => (prev === 'search' ? null : 'search'))
            }
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-base font-medium text-text-primary">
              <SearchIcon className="h-4 w-4" />
              搜尋
            </span>
            <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${expandedSection === 'search' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'search' && (
            <div className="border-t border-border-default p-4">
              <SearchWorkspace />
            </div>
          )}
        </section>

        <section id="people-db-import" className="rounded-lg border border-border-default bg-bg-primary scroll-mt-24">
          <button
            type="button"
            onClick={() =>
              setExpandedSection((prev) => (prev === 'import' ? null : 'import'))
            }
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-base font-medium text-text-primary">
              <Upload className="h-4 w-4" />
              匯入
            </span>
            <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${expandedSection === 'import' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'import' && (
            <div className="border-t border-border-default p-4">
              <ImportWorkspace />
            </div>
          )}
        </section>

        <section id="people-db-sources" className="rounded-lg border border-border-default bg-bg-primary scroll-mt-24">
          <button
            type="button"
            onClick={() =>
              setExpandedSection((prev) => (prev === 'sources' ? null : 'sources'))
            }
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-base font-medium text-text-primary">
              <FolderTree className="h-4 w-4" />
              資料來源
            </span>
            <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${expandedSection === 'sources' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'sources' && (
            <div className="border-t border-border-default p-4">
              <SourcesWorkspace />
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
