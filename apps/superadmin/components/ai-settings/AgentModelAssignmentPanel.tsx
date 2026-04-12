'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Bot, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AgentList } from './agent-model/AgentList';
import { AgentStrategyForm, type AvailableModel } from './agent-model/AgentStrategyForm';
import { AgentRecommendationPanel } from './agent-model/AgentRecommendationPanel';
import { AI_AGENT_REGISTRY, getAgentByKey } from '@/lib/ai/agent-registry';
import { useAgentAssignments } from '@/lib/hooks/useAgentAssignments';
import { useModelRoleCatalog } from '@/lib/hooks/useModelRoleCatalog';
import { getAvailableModelsListWithStaticFallback } from '@/lib/utils/total-available-models';
import { AI_PROVIDERS, getProviderById } from '@/lib/ai-providers';
import { getModelDisplayName } from '@/components/ai-settings/model-evaluator/utils';
import {
  generateAgentReportMarkdown,
  makeAgentReportFilename,
} from '@/lib/ai/agent-report';
import type { SavedKey, KeyValidationResult, ModelEvaluation } from '@/lib/hooks/useAISettings';
import type { AgentAssignmentPatch } from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AgentModelAssignmentPanelProps {
  savedKeys: SavedKey[];
  validateAllResultsByKeyId: Record<string, KeyValidationResult>;
  evaluations: ModelEvaluation[];
  userId: string;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function AgentModelAssignmentPanel({
  savedKeys,
  validateAllResultsByKeyId,
  evaluations,
  userId,
}: AgentModelAssignmentPanelProps) {
  const { assignmentsByKey, loading, error, save, reset } = useAgentAssignments({ userId });

  // Hoist the role catalog hook here so both the per-agent recommendation
  // panel AND the Markdown exporter see the same rows (no double fetch).
  const catalog = useModelRoleCatalog({
    savedKeys,
    validationCache: validateAllResultsByKeyId,
    userId,
  });

  // Default: first agent in the registry.
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>(() =>
    AI_AGENT_REGISTRY[0]?.key ?? '',
  );

  const selectedAgent = getAgentByKey(selectedAgentKey) ?? AI_AGENT_REGISTRY[0];
  const currentAssignment = selectedAgent ? assignmentsByKey[selectedAgent.key] : undefined;

  // Build the available-models list once, deduped by (provider, modelId).
  const availableModels = useMemo<AvailableModel[]>(() => {
    const rawList = getAvailableModelsListWithStaticFallback(
      validateAllResultsByKeyId,
      savedKeys.map((k) => ({ id: k.id, provider: k.provider })),
    );
    const seen = new Set<string>();
    const out: AvailableModel[] = [];
    for (const { providerId, modelId } of rawList) {
      const dedupKey = `${providerId}::${modelId}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const providerInfo = getProviderById(providerId as Parameters<typeof getProviderById>[0]);
      out.push({
        providerId,
        providerName: providerInfo?.name ?? providerId,
        modelId,
        modelName: getModelDisplayName(providerId, modelId),
      });
    }
    // Stable sort: provider name, then model name.
    out.sort((a, b) => {
      if (a.providerName === b.providerName) return a.modelName.localeCompare(b.modelName);
      return a.providerName.localeCompare(b.providerName);
    });
    return out;
  }, [validateAllResultsByKeyId, savedKeys]);

  const providerNameLookup = useCallback((providerId: string): string => {
    const p = AI_PROVIDERS.find((x) => x.id === providerId);
    return p?.name ?? providerId;
  }, []);

  const handleSave = useCallback(
    async (patch: AgentAssignmentPatch) => {
      await save(patch);
    },
    [save],
  );

  const handleReset = useCallback(async () => {
    if (!selectedAgent) return;
    // reset() returns the new AgentAssignment, but the form refreshes
    // from the hook's `assignmentsByKey`, so we just await and discard.
    await reset(selectedAgent.key);
  }, [reset, selectedAgent]);

  // -- Full-agent Markdown export (P1) --
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    try {
      const markdown = generateAgentReportMarkdown({
        assignmentsByKey,
        catalogRows: catalog.rows,
        evaluations,
      });
      const filename = makeAgentReportFilename();
      if (typeof window === 'undefined') return;
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [assignmentsByKey, catalog.rows, evaluations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-accent" size={24} />
        <span className="ml-3 text-text-secondary text-sm">載入 Agent 設定中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-base border border-red-300/40 bg-red-50/80 p-4 text-sm text-red-600">
        載入 Agent 設定失敗：{error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border-default">
        <Bot size={18} className="text-emerald-600" />
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-text-primary">模型選擇與設定</h2>
          <p className="text-[11px] text-text-muted">
            為每個 AI Agent 指派 Primary 模型 + Fallback 策略（全平台共用）
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            disabled={exporting || catalog.loading}
            leftIcon={<Download size={12} />}
            title="匯出全部 14 個 Agent 的策略 + 推薦模型快照為 Markdown 檔，可直接貼入 project-process/dev-logs/"
            data-testid="agent-export-button"
          >
            匯出報告
          </Button>
        </div>
      </div>

      {/* Body: left agent list + right strategy form + recommendations */}
      <div className="grid grid-cols-12 gap-3 min-h-[480px]">
        {/* Left rail */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 border border-border-default rounded-base bg-bg-secondary p-2 max-h-[640px]">
          <AgentList
            selectedAgentKey={selectedAgent?.key ?? null}
            onSelect={setSelectedAgentKey}
            assignmentsByKey={assignmentsByKey}
            getProviderName={providerNameLookup}
          />
        </aside>

        {/* Right detail */}
        <section className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col gap-3 min-w-0">
          {selectedAgent ? (
            <>
              <AgentStrategyForm
                key={selectedAgent.key}
                agent={selectedAgent}
                assignment={currentAssignment}
                availableModels={availableModels}
                onSave={handleSave}
                onReset={handleReset}
              />
              <AgentRecommendationPanel
                agent={selectedAgent}
                catalog={catalog}
                savedKeys={savedKeys}
                validationCache={validateAllResultsByKeyId}
                evaluations={evaluations}
              />
            </>
          ) : (
            <p className="text-sm text-text-muted italic">請從左側選擇一個 Agent。</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default AgentModelAssignmentPanel;
