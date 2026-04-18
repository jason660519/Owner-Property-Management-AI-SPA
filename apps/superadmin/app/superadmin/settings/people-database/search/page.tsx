'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import DatasetTreePanel from '@/components/people-database/DatasetTreePanel';
import {
  buildDatasetTree,
  flattenSelectedPaths,
  type DatasetTreeNode,
} from '@/lib/people-db/dataset-tree';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PeopleRecord {
  id: string;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  company: string | null;
  data_source: string | null;
  quality_score: number | null;
  import_batch_id: string | null;
  source_file_path: string | null;
  source_document_id: string | null;
  created_at: string;
}

interface ApiPeopleRecord {
  record_id: string;
  full_name?: string | null;
  name?: string | null;
  id_number?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  company?: string | null;
  organization?: string | null;
  data_source?: string | null;
  quality_score?: number | null;
  import_batch_id?: string | null;
  source_file_path?: string | null;
  source_document_id?: string | null;
  created_at?: string | null;
}

interface SearchResponse {
  results: ApiPeopleRecord[];
  total: number;
  page: number;
  page_size: number;
  group_by?: 'person' | 'record';
}

// Sprint 4b: person-aggregate shape returned when group_by=person.
interface PersonAggregate {
  person_id: string | null;
  canonical_name: string | null;
  canonical_id_no: string | null;
  canonical_phones: string[];
  canonical_address: string | null;
  source_count: number;
  quality_score: number | null;
  sources: ApiPeopleRecord[];
}

interface PersonSearchResponse {
  results: PersonAggregate[];
  total: number;
  page: number;
  page_size: number;
  group_by: 'person';
}

interface DataSourceFacet {
  key: string;
  count: number;
}

interface DataSourceResponse {
  datasets: DataSourceFacet[];
}

interface ImportBatchSummary {
  batch_id: string;
  label: string | null;
  data_source: string | null;
  status: string | null;
  total_records: number;
  processed_records: number;
  skipped_records: number;
  imported_by: string | null;
  created_at: string | null;
}

interface ImportBatchResponse {
  batches: ImportBatchSummary[];
}

type QualityLevel = 'all' | 'high' | 'medium' | 'low';
type GroupBy = 'person' | 'record';

function toPercentQuality(score: number | null): number | null {
  if (score === null || Number.isNaN(score)) return null;
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function qualityVariant(score: number | null): 'success' | 'warning' | 'error' | 'default' {
  const normalized = toPercentQuality(score);
  if (normalized === null) return 'default';
  if (normalized >= 80) return 'success';
  if (normalized >= 50) return 'warning';
  return 'error';
}

function qualityLabel(score: number | null): string {
  const normalized = toPercentQuality(score);
  if (normalized === null) return '—';
  if (normalized >= 80) return `${normalized} 高`;
  if (normalized >= 50) return `${normalized} 中`;
  return `${normalized} 低`;
}

function batchStatusVariant(status: string | null): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (!status) return 'default';
  if (status === 'completed') return 'success';
  if (status === 'processing' || status === 'pending') return 'info';
  if (status === 'failed') return 'error';
  if (status === 'queued') return 'warning';
  return 'default';
}

function sourceFileName(path: string | null): string {
  if (!path) return '—';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<PeopleRecord, unknown>[] = [
  {
    id: 'full_name',
    accessorKey: 'full_name',
    header: '姓名',
    cell: ({ row }) => {
      const name = String(row.original.full_name ?? '');
      const recordId = row.original.id;
      if (!recordId) {
        return <span className="font-medium text-text-primary">{name || '—'}</span>;
      }
      return (
        <Link
          href={`/superadmin/settings/people-database/person/${encodeURIComponent(recordId)}`}
          className="font-medium text-accent hover:underline"
        >
          {name || '—'}
        </Link>
      );
    },
  },
  {
    id: 'id_number',
    accessorKey: 'id_number',
    header: '身分證字號',
    cell: ({ getValue }) => (
      <span className="text-text-secondary font-mono text-xs">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: '電話',
    cell: ({ getValue }) => <span className="text-text-secondary">{String(getValue() ?? '—')}</span>,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => <span className="text-text-secondary">{String(getValue() ?? '—')}</span>,
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址',
    cell: ({ getValue }) => (
      <span className="text-text-secondary truncate max-w-[200px] block">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    id: 'source',
    header: '資料來源 / 原始檔',
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <span className="block text-text-secondary">{row.original.data_source ?? '—'}</span>
        <span className="block text-[11px] text-text-secondary/80 truncate max-w-[220px]">
          {sourceFileName(row.original.source_file_path)}
        </span>
      </div>
    ),
  },
  {
    id: 'quality_score',
    accessorKey: 'quality_score',
    header: '品質分數',
    cell: ({ row }) => {
      const score = row.original.quality_score;
      return <Badge variant={qualityVariant(score)}>{qualityLabel(score)}</Badge>;
    },
  },
  {
    id: 'import_batch_id',
    accessorKey: 'import_batch_id',
    header: '批次',
    cell: ({ getValue }) => (
      <span className="font-mono text-[11px] text-text-secondary">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: '匯入時間',
    cell: ({ getValue }) => {
      const val = getValue();
      if (!val) return <span className="text-text-secondary">—</span>;
      const d = new Date(String(val));
      return <span className="text-text-secondary text-xs">{d.toLocaleDateString('zh-TW')}</span>;
    },
  },
];

// initialWidths must match columns.length (9)
const INITIAL_WIDTHS = [12, 13, 10, 12, 18, 16, 8, 11, 10];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeopleDatabaseSearchWorkspace() {
  const [query, setQuery] = useState('');
  const [datasets, setDatasets] = useState<DataSourceFacet[]>([]);
  const [datasetTree, setDatasetTree] = useState<DatasetTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatchSummary[]>([]);
  const [qualityFilter, setQualityFilter] = useState<QualityLevel>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<PeopleRecord[]>([]);
  // Sprint 4b: person-mode aggregates are returned when groupBy='person'.
  const [personResults, setPersonResults] = useState<PersonAggregate[]>([]);
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>('person');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    setTreeLoading(true);

    // Prefer the new hierarchical endpoint; fall back to the flat /datasets
    // facet endpoint if it fails (e.g. backend not yet migrated).
    fetch('/api/people-db/dataset-tree')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { tree?: DatasetTreeNode[] }) => {
        if (cancelled) return;
        const nextTree = data.tree ?? [];
        setDatasetTree(nextTree);
        setDatasets(nextTree.map((n) => ({ key: n.path, count: n.count })));
        setSelectedSources((prev) => (prev.length > 0 ? prev : nextTree.map((n) => n.path)));
      })
      .catch(() => {
        // Legacy fallback: build a flat tree from the old /datasets endpoint.
        if (cancelled) return;
        fetch('/api/people-db/datasets')
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
          .then((data: DataSourceResponse) => {
            if (cancelled) return;
            const nextDatasets = data.datasets ?? [];
            const fallbackTree = buildDatasetTree(
              nextDatasets.map((d) => ({ key: d.key, doc_count: d.count })),
            );
            setDatasets(nextDatasets);
            setDatasetTree(fallbackTree);
            setSelectedSources((prev) =>
              prev.length > 0
                ? prev.filter((item) => nextDatasets.some((dataset) => dataset.key === item))
                : nextDatasets.map((item) => item.key),
            );
          })
          .catch(() => null);
      })
      .finally(() => {
        if (!cancelled) setTreeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/people-db/import/batches?limit=8')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: ImportBatchResponse) => {
        if (cancelled) return;
        setImportBatches(data.batches ?? []);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const mapApiRecord = (record: ApiPeopleRecord): PeopleRecord => ({
    id: record.record_id,
    full_name: record.full_name ?? record.name ?? '',
    id_number: record.id_number ?? null,
    phone: record.phone ?? null,
    mobile: record.mobile ?? null,
    email: record.email ?? null,
    address: record.address ?? null,
    company: record.company ?? record.organization ?? null,
    data_source: record.data_source ?? null,
    quality_score: record.quality_score ?? null,
    import_batch_id: record.import_batch_id ?? null,
    source_file_path: record.source_file_path ?? null,
    source_document_id: record.source_document_id ?? null,
    created_at: record.created_at ?? '',
  });

  const doSearch = useCallback(
    async (currentPage = 1) => {
      if (datasets.length > 0 && selectedSources.length === 0) {
        setHasSearched(true);
        setResults([]);
        setTotal(0);
        setPage(1);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      const params = new URLSearchParams({
        q: query.trim(),
        page: String(currentPage),
        page_size: String(PAGE_SIZE),
        group_by: groupBy,
      });
      if (qualityFilter !== 'all') params.set('quality', qualityFilter);
      // Expand parent selections to include every descendant path so backend
      // filters can emit precise terms queries regardless of tree depth.
      const expandedPaths = flattenSelectedPaths(selectedSources, datasetTree);
      const payloadPaths = expandedPaths.length > 0 ? expandedPaths : selectedSources;
      payloadPaths.forEach((source) => params.append('data_sources', source));

      try {
        const res = await fetch(`/api/people-db/search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchResponse | PersonSearchResponse;
        if (data.group_by === 'person') {
          const agg = (data as PersonSearchResponse).results;
          setPersonResults(agg);
          setResults([]);
        } else {
          setResults((data.results as ApiPeopleRecord[]).map(mapApiRecord));
          setPersonResults([]);
        }
        setTotal(data.total);
        setPage(currentPage);
        setExpandedPersons(new Set());
      } finally {
        setLoading(false);
      }
    },
    [datasetTree, datasets.length, groupBy, query, qualityFilter, selectedSources]
  );

  // When the user flips the toggle after running a search, refetch with the
  // new group_by so the UI reflects the chosen aggregation immediately.
  useEffect(() => {
    if (hasSearched) {
      void doSearch(1);
    }
    // `doSearch` is stable between groupBy flips because we include groupBy
    // in its deps; depending on it directly would schedule a double fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(1);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

      {/* ---- Left: Dataset tree panel (sticky on large screens) ---- */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <DatasetTreePanel
          tree={datasetTree}
          selectedPaths={selectedSources}
          onChange={setSelectedSources}
          loading={treeLoading}
        />
      </div>

      {/* ---- Right: Search workspace ---- */}
      <div className="space-y-5 min-w-0">

        {/* ---- Header ---- */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">搜尋人員資料庫</h1>
          <p className="text-text-secondary mt-1">支援電話/身分證精準查詢，並可追溯每筆資料來源與匯入批次。</p>
        </div>

        {/* ---- Group-by toggle (person aggregate vs. flat records) ---- */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-secondary">結果呈現：</span>
          <Button
            variant={groupBy === 'person' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('person')}
            aria-pressed={groupBy === 'person'}
          >
            依 person 聚合
          </Button>
          <Button
            variant={groupBy === 'record' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('record')}
            aria-pressed={groupBy === 'record'}
          >
            依 record 展開
          </Button>
        </div>

        {/* ---- Search bar ---- */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                <Input
                  ref={inputRef}
                  placeholder="輸入姓名、電話、身分證字號…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => doSearch(1)} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : '搜尋'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters((v) => !v)}
                aria-pressed={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                篩選
              </Button>
            </div>

            {/* Filters panel — dataset selection moved to left tree panel. */}
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-default">
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">品質分數</label>
                  <select
                    className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    value={qualityFilter}
                    onChange={(e) => setQualityFilter(e.target.value as QualityLevel)}
                  >
                    <option value="all">全部</option>
                    <option value="high">高（≥ 80）</option>
                    <option value="medium">中（50–79）</option>
                    <option value="low">低（&lt; 50）</option>
                  </select>
                </div>
                <div className="text-xs text-text-secondary flex items-end">
                  資料來源請於左側樹狀面板勾選。
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Import history ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近匯入批次</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {importBatches.length === 0 ? (
              <p className="text-sm text-text-secondary">目前沒有可顯示的匯入批次。</p>
            ) : (
              importBatches.slice(0, 5).map((batch) => (
                <div key={batch.batch_id} className="flex flex-wrap items-center gap-2 rounded border border-border-default p-2 text-xs">
                  <Badge variant={batchStatusVariant(batch.status)}>{batch.status ?? 'unknown'}</Badge>
                  <span className="text-text-primary">{batch.label ?? batch.batch_id}</span>
                  <span className="text-text-secondary">{batch.data_source ?? '—'}</span>
                  <span className="text-text-secondary">
                    {batch.processed_records}/{batch.total_records}
                  </span>
                  <span className="text-text-secondary">
                    {batch.created_at ? new Date(batch.created_at).toLocaleString('zh-TW') : '—'}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ---- Results ---- */}
        {hasSearched && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                搜尋結果
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-text-secondary">
                    共 {total.toLocaleString()} 筆
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-text-secondary gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  搜尋中…
                </div>
              ) : groupBy === 'person' ? (
                personResults.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-text-secondary">
                    沒有符合的資料
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {personResults.map((p, idx) => {
                      const key = p.person_id ?? `orphan-${idx}`;
                      const isExpanded = expandedPersons.has(key);
                      return (
                        <div
                          key={key}
                          className="rounded-md border border-border-default p-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-text-primary">
                              {p.canonical_name ?? '—'}
                            </span>
                            {p.person_id ? (
                              <Badge variant="info">person</Badge>
                            ) : (
                              <Badge variant="warning">未解析</Badge>
                            )}
                            <span className="text-xs text-text-secondary">
                              電話：{p.canonical_phones.join('、') || '—'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              地址：{p.canonical_address ?? '—'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-auto"
                              onClick={() => {
                                setExpandedPersons((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                });
                              }}
                            >
                              {isExpanded
                                ? `隱藏 ${p.sources.length} 筆來源`
                                : `顯示 ${p.sources.length} 筆來源`}
                            </Button>
                          </div>
                          {isExpanded && (
                            <ul className="pl-3 space-y-1 text-xs text-text-secondary">
                              {p.sources.map((s) => (
                                <li key={s.record_id} className="flex flex-wrap gap-2">
                                  <span className="font-mono">{s.record_id}</span>
                                  <span>{s.full_name ?? s.name ?? ''}</span>
                                  <span>{s.data_source ?? ''}</span>
                                  <span className="truncate">
                                    {s.source_file_path ?? ''}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : results.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-text-secondary">
                  沒有符合的資料
                </div>
              ) : (
                <>
                  <EnhancedTable<PeopleRecord>
                    tableId="people-db-search-results"
                    columns={columns}
                    data={results}
                    initialWidths={INITIAL_WIDTHS}
                    pageSizes={[20, 50, 100]}
                    getSearchValue={(row: PeopleRecord) =>
                      [row.full_name, row.id_number, row.phone, row.mobile, row.email, row.address, row.data_source, row.source_file_path]
                        .filter(Boolean)
                        .join(' ')
                    }
                    minWidth={1100}
                  />
                  {/* Pagination controls (page-level, not per-table-page) */}
                  {total > PAGE_SIZE && (
                    <div className="flex justify-center gap-2 py-4 border-t border-border-default">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => doSearch(page - 1)}
                      >
                        上一頁
                      </Button>
                      <span className="flex items-center text-sm text-text-secondary px-2">
                        第 {page} / {Math.ceil(total / PAGE_SIZE)} 頁
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * PAGE_SIZE >= total || loading}
                        onClick={() => doSearch(page + 1)}
                      >
                        下一頁
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function PeopleDatabaseSearchPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫 — 搜尋"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: '搜尋' },
      ]}
    >
      <PeopleDatabaseSearchWorkspace />
    </DashboardLayout>
  );
}
