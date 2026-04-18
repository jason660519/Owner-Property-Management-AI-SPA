'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Star, Database } from 'lucide-react';
import type { DatasetTreeNode } from '@/lib/people-db/dataset-tree';
import { flattenSelectedPaths, totalCountForPaths } from '@/lib/people-db/dataset-tree';

export interface DatasetTreePanelProps {
  tree: DatasetTreeNode[];
  selectedPaths: string[];
  onChange: (paths: string[]) => void;
  loading?: boolean;
  /**
   * Soft warning threshold — when the computed selection count exceeds this
   * value, the panel renders a "fewer sources = faster" hint.
   */
  scopeWarnThreshold?: number;
}

interface FlatNode {
  node: DatasetTreeNode;
  depth: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('zh-TW');
  } catch {
    return '—';
  }
}

function formatQuality(score: number | null): string {
  if (score === null) return '';
  const normalized = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `品質 ${normalized}`;
}

function collectDescendantPaths(node: DatasetTreeNode): string[] {
  const result: string[] = [node.path];
  for (const child of node.children) result.push(...collectDescendantPaths(child));
  return result;
}

export function DatasetTreePanel({
  tree,
  selectedPaths,
  onChange,
  loading = false,
  scopeWarnThreshold = 500_000,
}: DatasetTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Default: expand roots that have children so the user sees hierarchy.
    const next = new Set<string>();
    for (const node of tree) if (node.children.length > 0) next.add(node.path);
    return next;
  });

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  const toggleSelect = (node: DatasetTreeNode) => {
    const descendants = collectDescendantPaths(node);
    const nextSet = new Set(selectedSet);
    const currentlySelected = descendants.every((p) => nextSet.has(p));
    if (currentlySelected) {
      for (const p of descendants) nextSet.delete(p);
    } else {
      for (const p of descendants) nextSet.add(p);
    }
    onChange(Array.from(nextSet));
  };

  const flattened = useMemo(() => {
    const out: FlatNode[] = [];
    const walk = (node: DatasetTreeNode, depth: number) => {
      out.push({ node, depth });
      if (expanded.has(node.path)) {
        for (const child of node.children) walk(child, depth + 1);
      }
    };
    for (const root of tree) walk(root, 0);
    return out;
  }, [tree, expanded]);

  const effectivePaths = useMemo(
    () => flattenSelectedPaths(selectedPaths, tree),
    [selectedPaths, tree],
  );
  const scopeCount = useMemo(() => totalCountForPaths(effectivePaths, tree), [effectivePaths, tree]);
  const rootSelectedCount = useMemo(
    () => tree.filter((n) => selectedSet.has(n.path)).length,
    [tree, selectedSet],
  );

  const selectAllRoots = () => {
    const next = new Set<string>();
    for (const root of tree) for (const p of collectDescendantPaths(root)) next.add(p);
    onChange(Array.from(next));
  };

  const clearAll = () => onChange([]);

  return (
    <aside
      className="flex flex-col rounded-lg border border-border-default bg-bg-primary"
      data-testid="dataset-tree-panel"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">資料來源</h3>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={selectAllRoots}
            className="rounded border border-border-default px-2 py-0.5 text-text-secondary hover:bg-bg-secondary"
          >
            全選
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-border-default px-2 py-0.5 text-text-secondary hover:bg-bg-secondary"
          >
            清空
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-h-[70vh] px-1 py-2">
        {loading ? (
          <p className="px-3 py-4 text-xs text-text-secondary">載入中…</p>
        ) : flattened.length === 0 ? (
          <p className="px-3 py-4 text-xs text-text-secondary">尚無資料來源。匯入資料後將自動出現於此。</p>
        ) : (
          <ul className="space-y-0.5" role="tree">
            {flattened.map(({ node, depth }) => {
              const descendants = collectDescendantPaths(node);
              const allSelected = descendants.every((p) => selectedSet.has(p));
              const someSelected = !allSelected && descendants.some((p) => selectedSet.has(p));
              const hasChildren = node.children.length > 0;
              const isExpanded = expanded.has(node.path);

              return (
                <li key={node.path} role="treeitem" aria-level={depth + 1}>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-secondary"
                    style={{ paddingLeft: `${depth * 14 + 6}px` }}
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(node.path)}
                        className="text-text-secondary hover:text-text-primary"
                        aria-label={isExpanded ? '收合' : '展開'}
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="inline-block w-3.5" />
                    )}

                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={() => toggleSelect(node)}
                      className="h-3.5 w-3.5"
                      aria-label={`選取 ${node.label}`}
                    />

                    <span className="flex-1 flex items-center gap-1.5 text-sm text-text-primary truncate">
                      {node.favorited && <Star className="h-3 w-3 text-accent" aria-label="收藏" />}
                      <span className={node.enabled ? '' : 'line-through text-text-secondary'}>{node.label}</span>
                    </span>

                    <span className="shrink-0 text-[11px] text-text-secondary">
                      {formatCount(node.count)}
                    </span>
                  </div>
                  {!hasChildren && (node.qualityAvg !== null || node.lastImportedAt) && (
                    <div
                      className="text-[10px] text-text-secondary/80 pb-1"
                      style={{ paddingLeft: `${depth * 14 + 38}px` }}
                    >
                      {formatQuality(node.qualityAvg)}
                      {node.qualityAvg !== null && node.lastImportedAt ? ' · ' : ''}
                      {node.lastImportedAt ? `最後匯入 ${formatDate(node.lastImportedAt)}` : ''}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-border-default px-3 py-2 text-xs text-text-secondary space-y-1">
        <div data-testid="scope-summary">
          將搜尋 <strong className="text-text-primary">{rootSelectedCount}</strong> 個來源 /
          約 <strong className="text-text-primary">{scopeCount.toLocaleString()}</strong> 筆
        </div>
        {scopeCount > scopeWarnThreshold && (
          <div
            role="alert"
            data-testid="scope-warning"
            className="rounded border border-border-default bg-bg-secondary px-2 py-1 text-[11px] text-text-primary"
          >
            資料量大（&gt; {formatCount(scopeWarnThreshold)}）— 勾選越少，搜尋越快。
          </div>
        )}
      </footer>
    </aside>
  );
}

export default DatasetTreePanel;
