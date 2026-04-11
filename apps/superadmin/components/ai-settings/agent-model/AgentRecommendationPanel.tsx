'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Server,
  Tag as TagIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  UseModelRoleCatalogReturn,
} from '@/lib/hooks/useModelRoleCatalog';
import type { ModelEvaluation } from '@/lib/hooks/useAISettings';
import type { AgentDef } from '@/lib/ai/agent-registry';
import type { ModelRoleCatalogRow, ModelStatus } from '@/lib/types/model-role-catalog';
import { ClassifyConfigSheet, type ClassifyMode } from '@/app/superadmin/settings/api_key_and_model_setting/model-role-catalog/ClassifyConfigSheet';
import { TagEditorSheet } from '@/app/superadmin/settings/api_key_and_model_setting/model-role-catalog/TagEditorSheet';
import { filterCatalogForAgent } from '@/lib/ai/agent-report';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AgentRecommendationPanelProps {
  agent: AgentDef;
  /** Catalog hook result hoisted from AgentModelAssignmentPanel. */
  catalog: UseModelRoleCatalogReturn;
  /** Needed by ClassifyConfigSheet to build its classifier picker. */
  savedKeys: SavedKey[];
  validationCache: Record<string, KeyValidationResult>;
  evaluations: ModelEvaluation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(status: ModelStatus): 'success' | 'error' | 'default' {
  switch (status) {
    case 'available':
      return 'success';
    case 'invalid':
      return 'error';
    default:
      return 'default';
  }
}

function statusLabel(status: ModelStatus): string {
  switch (status) {
    case 'available':
      return '可用';
    case 'invalid':
      return '金鑰無效';
    default:
      return '無金鑰';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentRecommendationPanel({
  agent,
  catalog,
  savedKeys,
  validationCache,
  evaluations,
}: AgentRecommendationPanelProps) {
  // -- Sheet state --
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('online');
  const [editingRow, setEditingRow] = useState<ModelRoleCatalogRow | null>(null);

  const openClassify = useCallback((mode: ClassifyMode) => {
    setClassifyMode(mode);
    setClassifyOpen(true);
  }, []);

  const openTagEditor = useCallback((row: ModelRoleCatalogRow) => {
    setEditingRow(row);
  }, []);

  const closeTagEditor = useCallback((open: boolean) => {
    if (!open) setEditingRow(null);
  }, []);

  // Build eval lookup by "provider::model_id".
  const evalByKey = useMemo(() => {
    const map = new Map<string, ModelEvaluation>();
    for (const e of evaluations) map.set(`${e.provider}::${e.model_id}`, e);
    return map;
  }, [evaluations]);

  // Reuse the same filter logic as the Markdown exporter so they can't drift.
  const filteredRows = useMemo(
    () => filterCatalogForAgent(agent, catalog.rows),
    [agent, catalog.rows],
  );

  return (
    <div
      className="flex flex-col gap-2 p-4 border border-border-default rounded-base bg-bg-secondary"
      data-testid="agent-recommendation-panel"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Brain size={14} className="text-accent" />
        <span className="text-xs font-semibold text-text-primary">推薦模型</span>
        {agent.suggestedTagKeys.length > 0 ? (
          <span className="text-[10px] text-text-muted">
            （依標籤 {agent.suggestedTagKeys.join('、')} 篩選）
          </span>
        ) : (
          <span className="text-[10px] text-text-muted">
            （未指定標籤，顯示全部可用模型）
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => openClassify('online')}
            disabled={catalog.classifyStatus === 'running'}
            leftIcon={<Globe size={11} />}
            title="用一顆分類 LLM 依各模型的公開能力資訊重新打標籤（不實際呼叫各模型）"
          >
            網路分類
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => openClassify('offline')}
            disabled={catalog.classifyStatus === 'running'}
            leftIcon={<Server size={11} />}
            title="用一顆分類 LLM 根據既有 API 測試回應重新打標籤"
          >
            API 回應分類
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              void catalog.refresh();
            }}
            disabled={catalog.loading}
            leftIcon={<RefreshCw size={11} />}
            title="重新讀取 ai_model_role_assignments"
          >
            重新整理
          </Button>
        </div>
      </div>

      {catalog.classifyError && (
        <p className="text-[11px] text-red-500" role="alert">
          分類失敗：{catalog.classifyError}
        </p>
      )}

      {catalog.loading && <p className="text-xs text-text-muted">載入模型目錄中…</p>}

      {!catalog.loading && filteredRows.length === 0 && (
        <p className="text-xs text-text-muted italic">
          找不到符合條件的模型。請先按「網路分類」或「API 回應分類」讓 AI 幫模型打上標籤，或到「API 金鑰管理」新增並驗證金鑰。
        </p>
      )}

      {!catalog.loading && filteredRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead className="text-text-muted">
              <tr className="border-b border-border-default">
                <th className="text-left py-1 pr-2">Provider</th>
                <th className="text-left py-1 pr-2">Model</th>
                <th className="text-left py-1 pr-2">狀態</th>
                <th className="text-left py-1 pr-2">最近測試</th>
                <th className="text-left py-1 pr-2">角色標籤</th>
                <th className="text-left py-1 w-8" aria-label="edit" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const evalRow = evalByKey.get(`${row.provider}::${row.modelId}`);
                const working = evalRow?.is_working ?? null;
                return (
                  <tr
                    key={`${row.provider}::${row.modelId}`}
                    className="border-b border-border-subtle hover:bg-bg-tertiary/40"
                    data-testid={`rec-row-${row.provider}-${row.modelId}`}
                  >
                    <td className="py-1.5 pr-2 text-text-secondary">{row.providerName}</td>
                    <td className="py-1.5 pr-2 text-text-primary font-mono">{row.modelName}</td>
                    <td className="py-1.5 pr-2">
                      <Badge variant={statusBadgeVariant(row.status)} size="sm">
                        {statusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-2">
                      {working === null ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <AlertCircle size={12} /> 未測試
                        </span>
                      ) : working ? (
                        <span className="inline-flex items-center gap-1 text-green-500">
                          <CheckCircle2 size={12} /> 正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle size={12} /> 失敗
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex flex-wrap gap-1">
                        {row.assignments.length === 0 && (
                          <span className="text-text-muted italic">—</span>
                        )}
                        {row.assignments.map((a) => (
                          <span
                            key={a.tag_key}
                            className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded text-text-secondary"
                          >
                            {a.tag_key}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-1.5 w-8 text-right">
                      <button
                        type="button"
                        onClick={() => openTagEditor(row)}
                        className="p-1 text-text-muted hover:text-accent"
                        aria-label={`edit-tags-${row.provider}-${row.modelId}`}
                        title="編輯此模型的角色標籤"
                      >
                        <TagIcon size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Classify sheet (reuses the orphan component from model-role-catalog) */}
      <ClassifyConfigSheet
        open={classifyOpen}
        onOpenChange={setClassifyOpen}
        mode={classifyMode}
        savedKeys={savedKeys}
        validationCache={validationCache}
        onClassify={catalog.classifyModels}
        onRefreshAssignments={catalog.refreshAssignments}
        onComplete={() => setClassifyOpen(false)}
      />

      {/* Tag editor — opens on the row whose pencil was clicked */}
      <TagEditorSheet
        open={editingRow !== null}
        onOpenChange={closeTagEditor}
        row={editingRow}
        allTags={catalog.roleTags}
        onSave={catalog.saveManualAssignments}
        onCreateTag={catalog.createCustomTag}
      />
    </div>
  );
}
