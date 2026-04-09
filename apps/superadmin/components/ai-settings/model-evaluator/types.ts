// filepath: ai-settings/model-evaluator/types.ts
// Types, interfaces, and constants extracted from ModelEvaluator.tsx

import type { SavedKey, SavedModel, ModelEvaluation, KeyValidationResult, SavedModule, AssignedModel, DisplayStatusOverride } from '@/lib/hooks/useAISettings';

export type { AssignedModel, DisplayStatusOverride };

// ---------------------------------------------------------------------------
// Public interfaces (exported from ModelEvaluator)
// ---------------------------------------------------------------------------

export interface KeyWithId {
  id: string;
  provider: string;
}

export interface BatchProgress {
  tested: number;
  total: number;
  succeeded: number;
  failed: number;
}

export interface BatchResultEntry {
  key: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  success: boolean;
  output: string;
  imageUrl?: string;
}

export type RecentBatchReport = {
  savedAt: string;
  total: number;
  succeeded: number;
  failed: number;
  entries: BatchResultEntry[];
};

export interface ModelEvaluatorProps {
  savedKeys: SavedKey[];
  savedModels?: SavedModel[];
  savedEvaluations: ModelEvaluation[];
  validateAllResultsByKeyId?: Record<string, KeyValidationResult>;
  currentKeys?: KeyWithId[];
  onSave: (evaluations: ModelEvaluation[]) => Promise<void>;
  onTestModel: (
    provider: string,
    modelId: string,
    prompt?: string,
    file?: File | null
  ) => Promise<{ success: boolean; message?: string; output?: string; output_image_url?: string }>;
  onSaveModels?: (
    providerId: string,
    selections: { modelId: string; modelName: string; isPrimary: boolean }[]
  ) => Promise<void>;
  savedModules?: SavedModule[];
  onSaveModule?: (
    moduleKey: string,
    isEnabled: boolean,
    assignedModels: AssignedModel[],
    config?: Record<string, unknown>
  ) => Promise<void>;
  hiddenModuleKeys?: string[];
  globalTestPrompt: string;
  onChangeGlobalTestPrompt: (value: string) => void;
  uploadedFile: File | null;
  onChangeUploadedFile: (file: File | null) => void;
  summarySelectedCount: number;
  summaryTotalCount: number;
  promptVariableLabel?: string;
  headerActionsRef?:
    | React.Dispatch<React.SetStateAction<{
        runBatchTest: () => void;
        abortBatchTest: () => void;
        batchTesting: boolean;
        canBatchTest: boolean;
        tooltip: string;
        batchProgress: BatchProgress | null;
        testableCount: number;
        selectedCount: number;
        totalCount: number;
        filteredTotal: number;
        filteredSelectedCount: number;
        hasRecentBatchReport?: boolean;
        openRecentBatchReport?: () => void;
        applyRecentBatchReport?: () => Promise<void>;
        applyingRecentBatchReport?: boolean;
      } | null>>
    | React.RefObject<{
        runBatchTest: () => void;
        abortBatchTest: () => void;
        batchTesting: boolean;
        canBatchTest: boolean;
        tooltip: string;
        batchProgress: BatchProgress | null;
        testableCount: number;
        selectedCount: number;
        totalCount: number;
        filteredTotal: number;
        filteredSelectedCount: number;
        hasRecentBatchReport?: boolean;
        openRecentBatchReport?: () => void;
        applyRecentBatchReport?: () => Promise<void>;
        applyingRecentBatchReport?: boolean;
      } | null>;
  statusLabelMode?: 'vlm' | 'ocr';
}

// ---------------------------------------------------------------------------
// Table alignment types
// ---------------------------------------------------------------------------

export type TableHAlign = 'left' | 'center' | 'right';
export type TableVAlign = 'top' | 'middle' | 'bottom';

export const TABLE_H_ALIGN_CLASSES: Record<TableHAlign, string> = {
  left: '[&_th]:text-left [&_td]:text-left',
  center: '[&_th]:text-center [&_td]:text-center',
  right: '[&_th]:text-right [&_td]:text-right',
};

export const TABLE_V_ALIGN_CLASSES: Record<TableVAlign, string> = {
  top: '[&_th]:align-top [&_td]:align-top',
  middle: '[&_th]:align-middle [&_td]:align-middle',
  bottom: '[&_th]:align-bottom [&_td]:align-bottom',
};

// ---------------------------------------------------------------------------
// Model row type (used for allRows data)
// ---------------------------------------------------------------------------

export interface ModelRow {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
}

// ---------------------------------------------------------------------------
// Table settings (persisted via useTablePreferences)
// ---------------------------------------------------------------------------

export interface ModelEvalSettings extends Record<string, unknown> {
  columnWidths: number[];
  promptColumnLabel: string;
  freezeRowCount: 0 | 1;
  frozenColCount: number;
  tableAlignH: TableHAlign;
  tableAlignV: TableVAlign;
}

export const MODEL_EVAL_PAGE_KEY = 'model_evaluator';
export const MODEL_EVAL_STORAGE_KEY = 'model_evaluator_settings_v2';
export const FREEZE_ROW_STORAGE_KEY = 'superadmin-model-evaluator-freeze-row-v1';
export const MODEL_EVAL_DEFAULT_COLUMN_WIDTHS = [120, 80, 220, 48, 140, 72, 200, 140, 110, 88, 88, 88, 88, 88, 88, 88];

export const MODEL_EVAL_DEFAULTS: ModelEvalSettings = {
  columnWidths: [...MODEL_EVAL_DEFAULT_COLUMN_WIDTHS],
  promptColumnLabel: 'Prompt input',
  freezeRowCount: 1,
  frozenColCount: 0,
  tableAlignH: 'left',
  tableAlignV: 'top',
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const SS_FILTER_STATUSES = 'ai-eval-filter:statuses';
export const SS_FILTER_PROVIDERS = 'ai-eval-filter:providerIds';
export const LS_FILTER_CATEGORIES = 'ai-eval-filter:categories';
export const LS_RECENT_BATCH_REPORT = 'ai-eval:last-batch-report';

// ---------------------------------------------------------------------------
// Status display type
// ---------------------------------------------------------------------------

export type StatusDisplay = {
  type: 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested';
  label: string;
  title: string;
};
