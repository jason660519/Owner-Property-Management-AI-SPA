'use client';

// Top-level orchestrator for the prompt management page

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Loader2, PackagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PromptTagFilter } from './PromptTagFilter';
import { PromptTable } from './PromptTable';
import { PromptEditorSheet } from './PromptEditorSheet';
import { usePromptManager } from './usePromptManager';
import { exportPromptsAsMd } from './PromptFileIO';
import { bulkExportPrompts } from '@/app/superadmin/settings/evaluations-global-test/promptActions';
import { PROMPT_LOAD_MESSAGE_TYPE } from './types';
import type { SavePromptOpts, PromptSortField } from './types';
import type { TranscriptParsePreset } from '@/lib/transcript-parse-scenario-prompts';
import { seedDefaultPrompts } from './seedDefaultPrompts';

interface PromptManagementPageProps {
  transcriptParsePresets?: readonly TranscriptParsePreset[];
}

const SORT_OPTIONS: { value: PromptSortField; label: string }[] = [
  { value: 'updated_at', label: '更新時間' },
  { value: 'name', label: '名稱' },
  { value: 'is_favorite', label: '收藏優先' },
];

export function PromptManagementPage({ transcriptParsePresets }: PromptManagementPageProps) {
  const mgr = usePromptManager();
  const [hasOpener, setHasOpener] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Detect window.opener for postMessage integration
  useEffect(() => {
    setHasOpener(
      typeof window !== 'undefined' &&
      !!window.opener &&
      !(window.opener as Window).closed,
    );
  }, []);

  const handleLoad = useCallback((content: string, name: string) => {
    if (typeof window !== 'undefined' && window.opener && !(window.opener as Window).closed) {
      window.opener.postMessage(
        { type: PROMPT_LOAD_MESSAGE_TYPE, content, name },
        window.location.origin,
      );
    }
  }, []);

  // Bulk export
  const handleBulkExport = useCallback(async (ids: string[]) => {
    const result = await bulkExportPrompts(ids);
    if (result.data?.length) {
      exportPromptsAsMd(result.data);
    }
  }, []);

  // Save handler for sheet
  const handleSave = useCallback(async (
    name: string, content: string, opts: SavePromptOpts,
  ) => {
    if (mgr.editingPrompt) {
      return mgr.editPrompt(mgr.editingPrompt.id, name, content, opts);
    }
    return mgr.createPrompt(name, content, opts);
  }, [mgr]);

  // Seed all default prompts
  const handleSeedDefaults = useCallback(async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedDefaultPrompts();
      if (result.errors.length) {
        setSeedResult(`建立 ${result.created} 筆，跳過 ${result.skipped} 筆（已存在），錯誤：${result.errors.join('; ')}`);
      } else {
        setSeedResult(`建立 ${result.created} 筆，跳過 ${result.skipped} 筆（已存在）`);
      }
      // Refresh list
      await mgr.fetchPrompts();
    } catch {
      setSeedResult('建立失敗');
    }
    setSeeding(false);
    setTimeout(() => setSeedResult(null), 5000);
  }, [mgr]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={mgr.filters.search}
              onChange={e => mgr.setFilters({ search: e.target.value })}
              placeholder="搜尋名稱、內容、說明..."
              className="w-full pl-9 pr-8 py-2 rounded-md border border-border-default bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {mgr.filters.search && (
              <button
                type="button"
                onClick={() => mgr.setFilters({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <select
          value={mgr.filters.sortField}
          onChange={e => mgr.setFilters({ sortField: e.target.value as PromptSortField })}
          className="px-3 py-2 rounded-md border border-border-default bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Actions */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => mgr.openEditor()}
        >
          新增
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<PackagePlus className="w-4 h-4" />}
          onClick={handleSeedDefaults}
          isLoading={seeding}
          title="建立所有預設 Prompt（謄本解析、裁判、文案撰寫）"
        >
          預設
        </Button>
      </div>

      {/* Tag filter */}
      <PromptTagFilter
        allTags={mgr.allTags}
        selectedTags={mgr.filters.selectedTags}
        onToggleTag={mgr.toggleTagFilter}
        onClear={() => mgr.setFilters({ selectedTags: [] })}
      />

      {/* Opener hint */}
      {!hasOpener && (
        <div className="text-xs text-text-muted bg-bg-secondary rounded-md px-3 py-2 border border-border-subtle">
          從「謄本解析」或「統一測試」頁面點擊「在新分頁開啟」後，表格操作欄會出現「載入」按鈕，可將 Prompt 自動填回該頁。
        </div>
      )}

      {/* Seed defaults + result feedback */}
      {mgr.prompts.length === 0 && !mgr.loading && (
        <div className="flex flex-wrap items-center gap-3 bg-bg-secondary rounded-lg border border-border-subtle px-4 py-3">
          <span className="text-sm text-text-secondary">首次使用？</span>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<PackagePlus className="w-4 h-4" />}
            onClick={handleSeedDefaults}
            isLoading={seeding}
          >
            建立所有預設 Prompt
          </Button>
          <span className="text-xs text-text-muted">
            包含 4 種謄本解析情境、裁判 Prompt、物件描述文案
          </span>
        </div>
      )}
      {seedResult && (
        <div className="text-sm text-text-secondary bg-bg-secondary rounded-md px-3 py-2 border border-border-subtle">
          {seedResult}
        </div>
      )}

      {/* Loading / error */}
      {mgr.loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>載入中...</span>
        </div>
      ) : mgr.error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3">
          {mgr.error}
        </div>
      ) : (
        <PromptTable
          prompts={mgr.filteredPrompts}
          selectedIds={mgr.selectedIds}
          onToggleSelection={mgr.toggleSelection}
          onSelectAll={mgr.selectAll}
          onClearSelection={mgr.clearSelection}
          onToggleFavorite={mgr.toggleFavorite}
          onEdit={mgr.openEditor}
          onDelete={mgr.removePrompt}
          onLoad={hasOpener ? handleLoad : undefined}
          onBulkExport={handleBulkExport}
        />
      )}

      {/* Editor Sheet */}
      <PromptEditorSheet
        open={mgr.sheetOpen}
        onOpenChange={open => { if (!open) mgr.closeEditor(); }}
        prompt={mgr.editingPrompt}
        allTags={mgr.allTags}
        onSave={handleSave}
        onClose={mgr.closeEditor}
      />
    </div>
  );
}
