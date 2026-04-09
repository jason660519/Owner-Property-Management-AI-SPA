'use client';

import { useState, useMemo, useCallback } from 'react';
import { AlertCircle, Brain, Globe, Loader2, RefreshCw, Server, X } from 'lucide-react';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';
import { useModelRoleCatalog } from '@/lib/hooks/useModelRoleCatalog';
import type { ModelRoleCatalogRow } from '@/lib/types/model-role-catalog';
import { createModelRoleColumns, MODEL_ROLE_CATALOG_INITIAL_WIDTHS } from './columns';
import { TagEditorSheet } from './TagEditorSheet';
import { ClassifyConfigSheet, type ClassifyMode } from './ClassifyConfigSheet';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ModelRoleCatalogTableProps {
  savedKeys: SavedKey[];
  validationCache: Record<string, KeyValidationResult>;
  userId: string;
}

// ---------------------------------------------------------------------------
// Banner types
// ---------------------------------------------------------------------------

interface ErrorBannerData {
  message: string;
  mode: string;
  details: string;
  timestamp: string;
}

interface SuccessBannerData {
  count: number;
  mode: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModelRoleCatalogTable({
  savedKeys,
  validationCache,
  userId,
}: ModelRoleCatalogTableProps) {
  const catalog = useModelRoleCatalog({ savedKeys, validationCache, userId });

  // -- Tag editor sheet state --
  const [editingRow, setEditingRow] = useState<ModelRoleCatalogRow | null>(null);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  const handleEditTags = useCallback((row: ModelRoleCatalogRow) => {
    setEditingRow(row);
    setTagSheetOpen(true);
  }, []);

  // -- Classify config sheet state --
  const [classifySheetOpen, setClassifySheetOpen] = useState(false);
  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('online');

  const openClassifyConfig = useCallback((mode: ClassifyMode) => {
    setClassifyMode(mode);
    setClassifySheetOpen(true);
  }, []);

  // -- Banners --
  const [errorBanner, setErrorBanner] = useState<ErrorBannerData | null>(null);
  const [successBanner, setSuccessBanner] = useState<SuccessBannerData | null>(null);

  const handleClassifyComplete = useCallback(() => {
    // Refresh assignments after classification completes
    catalog.refresh();
  }, [catalog]);

  // -- Columns (memoized) --
  const columns = useMemo(
    () => createModelRoleColumns({ roleTags: catalog.roleTags, onEditTags: handleEditTags }),
    [catalog.roleTags, handleEditTags],
  );

  // -- Search accessor --
  const getSearchValue = useCallback(
    (row: ModelRoleCatalogRow) => `${row.providerName} ${row.modelName} ${row.modelId}`,
    [],
  );

  // -- Category accessor --
  const getCategoryValue = useCallback(
    (row: ModelRoleCatalogRow) => row.providerName,
    [],
  );

  // -- Toolbar --
  const toolbar = useMemo(() => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Open classify config sheets */}
      <button
        type="button"
        onClick={() => openClassifyConfig('online')}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
        title="由 AI 根據訓練知識，查詢各模型的公開能力資訊來分類"
      >
        <Globe size={12} />
        網路查詢分類
      </button>

      <button
        type="button"
        onClick={() => openClassifyConfig('offline')}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
        title="根據各分頁實際測試模型後的 API 回應結果來分類"
      >
        <Server size={12} />
        API Response 分類
      </button>

      <button
        type="button"
        onClick={() => catalog.refresh()}
        disabled={catalog.loading}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50"
        title="重新載入"
      >
        <RefreshCw size={12} className={catalog.loading ? 'animate-spin' : ''} />
      </button>
    </div>
  ), [openClassifyConfig, catalog.loading, catalog]);

  // -- Loading state --
  if (catalog.loading && catalog.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="animate-spin mr-2" size={18} />
        載入模型資料中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-cyan-500" />
        <h3 className="text-sm font-semibold text-text-primary">
          模型職責分類總覽
        </h3>
        <span className="text-xs text-text-muted">
          共 {catalog.rows.length} 個模型
        </span>
      </div>

      {/* Error banner — persists until user clicks X */}
      {errorBanner && (
        <div className="relative flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-red-400">
              {errorBanner.mode}失敗
            </p>
            <p className="text-xs text-red-300/90 break-words whitespace-pre-wrap">
              {errorBanner.message}
            </p>
            <p className="text-[10px] text-red-400/60">
              {errorBanner.timestamp} · {errorBanner.details}
            </p>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="shrink-0 p-1 rounded hover:bg-red-500/20 text-red-400/70 hover:text-red-300 transition-colors"
            title="關閉"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Success banner — auto-clears after 10s, or user can close */}
      {successBanner && (
        <div className="relative flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-400">
              {successBanner.mode}完成，共分類 {successBanner.count} 筆標籤
              <span className="ml-2 text-green-400/60">{successBanner.timestamp}</span>
            </p>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="shrink-0 p-1 rounded hover:bg-green-500/20 text-green-400/70 hover:text-green-300 transition-colors"
            title="關閉"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <EnhancedTable
        tableId="model-role-catalog"
        columns={columns}
        data={catalog.rows}
        initialWidths={MODEL_ROLE_CATALOG_INITIAL_WIDTHS}
        getSearchValue={getSearchValue}
        getCategoryValue={getCategoryValue}
        pageSizes={[20, 50, 100]}
        extraToolbar={toolbar}
      />

      {/* Tag Editor Sheet */}
      <TagEditorSheet
        open={tagSheetOpen}
        onOpenChange={setTagSheetOpen}
        row={editingRow}
        allTags={catalog.roleTags}
        onSave={catalog.saveManualAssignments}
        onCreateTag={catalog.createCustomTag}
      />

      {/* Classify Config Sheet */}
      <ClassifyConfigSheet
        open={classifySheetOpen}
        onOpenChange={setClassifySheetOpen}
        mode={classifyMode}
        savedKeys={savedKeys}
        validationCache={validationCache}
        onClassify={catalog.classifyModels}
        onRefreshAssignments={catalog.refreshAssignments}
        onComplete={handleClassifyComplete}
      />
    </div>
  );
}
