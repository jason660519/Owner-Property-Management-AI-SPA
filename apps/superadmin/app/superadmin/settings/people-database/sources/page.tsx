'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Star, StarOff, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { DatasetTreeNode } from '@/lib/people-db/dataset-tree';

interface MetadataRow {
  id: string;
  dataset_path: string;
  display_name: string | null;
  favorited: boolean;
  enabled: boolean;
  emoji: string | null;
  notes: string | null;
  updated_at: string;
}

interface TreeResponse {
  tree: DatasetTreeNode[];
}

interface MetadataResponse {
  rows: MetadataRow[];
}

interface FlatDatasetRow {
  path: string;
  label: string;
  count: number;
  favorited: boolean;
  enabled: boolean;
  displayName: string;
}

function flattenTree(nodes: DatasetTreeNode[], depth = 0): FlatDatasetRow[] {
  const rows: FlatDatasetRow[] = [];
  for (const node of nodes) {
    rows.push({
      path: node.path,
      label: `${'—'.repeat(depth)}${depth > 0 ? ' ' : ''}${node.label}`,
      count: node.count,
      favorited: node.favorited,
      enabled: node.enabled,
      displayName: node.label,
    });
    if (node.children.length > 0) rows.push(...flattenTree(node.children, depth + 1));
  }
  return rows;
}

export default function PeopleDatabaseSourcesPage() {
  const [treeRows, setTreeRows] = useState<FlatDatasetRow[]>([]);
  const [metadataByPath, setMetadataByPath] = useState<Record<string, MetadataRow>>({});
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [treeRes, metaRes] = await Promise.all([
        fetch('/api/people-db/dataset-tree'),
        fetch('/api/people-db/datasets/metadata'),
      ]);
      if (!treeRes.ok) throw new Error(`tree HTTP ${treeRes.status}`);
      if (!metaRes.ok) throw new Error(`metadata HTTP ${metaRes.status}`);

      const treeData = (await treeRes.json()) as TreeResponse;
      const metaData = (await metaRes.json()) as MetadataResponse;

      setTreeRows(flattenTree(treeData.tree ?? []));
      const map: Record<string, MetadataRow> = {};
      for (const row of metaData.rows ?? []) map[row.dataset_path] = row;
      setMetadataByPath(map);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return treeRows;
    return treeRows.filter(
      (r) => r.path.toLowerCase().includes(f) || r.displayName.toLowerCase().includes(f),
    );
  }, [treeRows, filter]);

  const save = useCallback(
    async (datasetPath: string, patch: Partial<MetadataRow>) => {
      setSavingPath(datasetPath);
      setErrorMsg(null);
      try {
        const existing = metadataByPath[datasetPath];
        const payload = {
          dataset_path: datasetPath,
          display_name: patch.display_name !== undefined ? patch.display_name : existing?.display_name ?? null,
          favorited: patch.favorited !== undefined ? patch.favorited : existing?.favorited ?? false,
          enabled: patch.enabled !== undefined ? patch.enabled : existing?.enabled ?? true,
          emoji: patch.emoji !== undefined ? patch.emoji : existing?.emoji ?? null,
          notes: patch.notes !== undefined ? patch.notes : existing?.notes ?? null,
        };
        const res = await fetch('/api/people-db/datasets/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = (await res.json()) as { detail?: string };
          throw new Error(json.detail ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { row: MetadataRow };
        setMetadataByPath((prev) => ({ ...prev, [datasetPath]: json.row }));
        // Refresh the tree rows' favorited/enabled flags locally for instant feedback.
        setTreeRows((prev) =>
          prev.map((r) =>
            r.path === datasetPath
              ? { ...r, favorited: json.row.favorited, enabled: json.row.enabled, displayName: json.row.display_name ?? r.displayName }
              : r,
          ),
        );
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '儲存失敗');
      } finally {
        setSavingPath(null);
      }
    },
    [metadataByPath],
  );

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedPaths((prev) => {
      const allSelected = filteredRows.every((r) => prev.has(r.path));
      if (allSelected) {
        const next = new Set(prev);
        for (const r of filteredRows) next.delete(r.path);
        return next;
      }
      const next = new Set(prev);
      for (const r of filteredRows) next.add(r.path);
      return next;
    });
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const applyBulk = useCallback(
    async (patch: { favorited?: boolean; enabled?: boolean }) => {
      const paths = Array.from(selectedPaths);
      if (paths.length === 0) return;
      setBulkBusy(true);
      setBulkInfo(null);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/people-db/datasets/metadata/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset_paths: paths, patch }),
        });
        const json = (await res.json()) as {
          updated?: number;
          rows?: MetadataRow[];
          detail?: string;
        };
        if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`);
        setMetadataByPath((prev) => {
          const next = { ...prev };
          for (const row of json.rows ?? []) next[row.dataset_path] = row;
          return next;
        });
        setTreeRows((prev) =>
          prev.map((r) => {
            const updated = (json.rows ?? []).find((row) => row.dataset_path === r.path);
            if (!updated) return r;
            return {
              ...r,
              favorited: updated.favorited,
              enabled: updated.enabled,
              displayName: updated.display_name ?? r.displayName,
            };
          }),
        );
        setBulkInfo(`已更新 ${json.updated ?? 0} 筆`);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '批次儲存失敗');
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedPaths],
  );

  const beginRename = (row: FlatDatasetRow) => {
    setEditingPath(row.path);
    setEditingName(metadataByPath[row.path]?.display_name ?? row.displayName);
  };

  const commitRename = async () => {
    if (!editingPath) return;
    const trimmed = editingName.trim();
    await save(editingPath, { display_name: trimmed || null });
    setEditingPath(null);
    setEditingName('');
  };

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫 — 資料來源管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: '資料來源管理' },
      ]}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">資料來源管理</h1>
          <p className="text-text-secondary mt-1">
            重新命名、收藏、啟用或停用資料來源。變更會立即反映在搜尋頁的樹狀面板。
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">資料來源清單</CardTitle>
            <CardDescription>
              {loading
                ? '載入中…'
                : `${filteredRows.length} 個節點（含資料夾與檔案）`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="依路徑或名稱篩選…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={loadAll} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                重新整理
              </Button>
            </div>

            {errorMsg && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-text-primary">
                {errorMsg}
              </div>
            )}

            {selectedPaths.size > 0 && (
              <div
                className="flex flex-wrap items-center gap-2 rounded border border-border-default bg-bg-secondary px-3 py-2 text-xs"
                role="toolbar"
                aria-label="批次操作"
                data-testid="bulk-toolbar"
              >
                <span className="text-text-primary">
                  已選 <strong>{selectedPaths.size}</strong> 筆
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyBulk({ favorited: true })}
                  disabled={bulkBusy}
                >
                  <Star className="h-3.5 w-3.5 mr-1" />
                  收藏
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyBulk({ favorited: false })}
                  disabled={bulkBusy}
                >
                  <StarOff className="h-3.5 w-3.5 mr-1" />
                  取消收藏
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyBulk({ enabled: true })}
                  disabled={bulkBusy}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  啟用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyBulk({ enabled: false })}
                  disabled={bulkBusy}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  停用
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkBusy}>
                  清除選取
                </Button>
                {bulkBusy && (
                  <span className="text-text-secondary inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> 批次處理中…
                  </span>
                )}
                {bulkInfo && !bulkBusy && (
                  <span className="text-text-secondary">{bulkInfo}</span>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded border border-border-default">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-center text-text-secondary font-medium w-9">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        aria-label="全選 / 取消全選"
                        className="text-text-secondary hover:text-text-primary"
                        data-testid="bulk-select-all"
                      >
                        {filteredRows.length > 0 &&
                        filteredRows.every((r) => selectedPaths.has(r.path)) ? (
                          <CheckSquare className="h-4 w-4 text-accent" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-text-secondary font-medium">路徑</th>
                    <th className="px-3 py-2 text-left text-text-secondary font-medium">顯示名稱</th>
                    <th className="px-3 py-2 text-right text-text-secondary font-medium">筆數</th>
                    <th className="px-3 py-2 text-center text-text-secondary font-medium">收藏</th>
                    <th className="px-3 py-2 text-center text-text-secondary font-medium">啟用</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const meta = metadataByPath[row.path];
                    const isEditing = editingPath === row.path;
                    const displayName = meta?.display_name ?? row.displayName;
                    const favorited = meta?.favorited ?? row.favorited;
                    const enabled = meta?.enabled ?? row.enabled;
                    const saving = savingPath === row.path;

                    const checked = selectedPaths.has(row.path);
                    return (
                      <tr
                        key={row.path}
                        className={`border-t border-border-default ${enabled ? '' : 'opacity-60'}`}
                      >
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(row.path)}
                            className="h-3.5 w-3.5"
                            aria-label={`選取 ${row.path}`}
                            data-testid="bulk-row-checkbox"
                          />
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs text-text-secondary">
                          {row.path}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={commitRename} disabled={saving}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPath(null)}>
                                取消
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginRename(row)}
                              className="text-sm text-text-primary hover:text-accent"
                            >
                              {displayName}
                              {meta?.display_name && (
                                <Badge variant="info" className="ml-2 text-[10px]">已改名</Badge>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => save(row.path, { favorited: !favorited })}
                            disabled={saving}
                            aria-label={favorited ? '取消收藏' : '加入收藏'}
                            className="text-text-secondary hover:text-accent disabled:opacity-50"
                          >
                            {favorited ? <Star className="h-4 w-4 text-accent" /> : <StarOff className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => save(row.path, { enabled: !enabled })}
                            disabled={saving}
                            aria-label={enabled ? '停用' : '啟用'}
                            className="text-text-secondary hover:text-text-primary disabled:opacity-50"
                          >
                            {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-text-secondary">
                        沒有符合的資料來源。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
