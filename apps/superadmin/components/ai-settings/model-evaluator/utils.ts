// filepath: ai-settings/model-evaluator/utils.ts
// Pure utility functions extracted from ModelEvaluator.tsx

import React, { useEffect } from 'react';
import { AI_PROVIDERS, FEATURE_MODULES } from '@/lib/ai-providers';
import { hasVisionCapability } from '@/lib/utils/vision-capability';
import type { ModelEvaluation, DisplayStatusOverride } from '@/lib/hooks/useAISettings';
import type { BatchResultEntry, RecentBatchReport, StatusDisplay, AssignedModel } from './types';
import { LS_RECENT_BATCH_REPORT } from './types';

// ---------------------------------------------------------------------------
// Module display constants
// ---------------------------------------------------------------------------

export const MODULE_ICON_MAP: Record<string, React.ElementType> = {};

export const MODULE_CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  ocr:       { text: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  assistant: { text: 'text-green-400',  bg: 'bg-green-500/10'  },
  generator: { text: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export const MODULE_SORT_LABEL: Record<string, string> = {
  online_ocr: 'OCR',
  online_ocr_parse: 'OCP',
  online_ocr_judge: 'OCJ',
  web_assistant: 'WAS',
  contract_assistant: 'CAS',
  blog_generator: 'GEN',
  property_description: 'PDS',
  ad_generator: 'AD',
  software_dev_engineer: 'SDE',
  ttd_engineer: 'TTD',
};

// ---------------------------------------------------------------------------
// Module eligible keys (precomputed per module)
// ---------------------------------------------------------------------------

export const MODULE_ELIGIBLE_KEYS: Record<string, Set<string>> = (() => {
  const result: Record<string, Set<string>> = {};
  for (const mod of FEATURE_MODULES) {
    const needed = (mod.requiredCapabilities ?? []) as string[];
    const keySet = new Set<string>();
    if (needed.length === 0) {
      result[mod.key] = keySet;
      continue;
    }
    for (const provider of AI_PROVIDERS) {
      for (const model of provider.models) {
        const caps = model.capabilities ?? [];
        if (needed.every((cap) => caps.includes(cap))) {
          keySet.add(`${provider.id}::${model.id}`);
        }
      }
    }
    result[mod.key] = keySet;
  }
  return result;
})();

// ---------------------------------------------------------------------------
// Assignment helpers
// ---------------------------------------------------------------------------

export function normalizeAssignments(assignments: AssignedModel[]): AssignedModel[] {
  if (assignments.length === 0) return [];
  const copied = [...assignments];
  copied.sort((a, b) => {
    const pa = typeof a.priority === 'number' && a.priority >= 1 ? a.priority : Number.MAX_SAFE_INTEGER;
    const pb = typeof b.priority === 'number' && b.priority >= 1 ? b.priority : Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    const ak = `${a.provider}::${a.model}`;
    const bk = `${b.provider}::${b.model}`;
    return ak.localeCompare(bk);
  });
  return copied.map((a, index) => ({ ...a, priority: index + 1 }));
}

export function reorderAssignment(
  assignments: AssignedModel[],
  providerId: string,
  modelId: string,
  requestedPriority: number,
): AssignedModel[] {
  if (assignments.length === 0) return assignments;
  const list = normalizeAssignments(assignments);
  const fromIndex = list.findIndex(
    (a) => a.provider === providerId && a.model === modelId,
  );
  if (fromIndex === -1) return list;
  const maxIndex = list.length - 1;
  const toIndex = Math.min(Math.max(requestedPriority - 1, 0), maxIndex);
  if (fromIndex === toIndex) return list;
  const [target] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, target);
  return normalizeAssignments(list);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useClickOutsideClose(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen, ref]);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function getModelDisplayName(providerId: string, modelId: string): string {
  const p = AI_PROVIDERS.find((x) => x.id === providerId);
  const m = p?.models.find((x) => x.id === modelId);
  return m?.name ?? modelId;
}

export function extractImageUrlFromOutput(output: string): string | undefined {
  if (!output) return undefined;
  const mdMatch = output.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
  if (mdMatch) return mdMatch[1];
  const bareMatch = output.match(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:[?#]\S*)?/i);
  if (bareMatch) return bareMatch[0];
  return undefined;
}

export function detectCategoryFromOutput(output: string | undefined): 'VLM' | 'LLM' | 'unknown' {
  const text = (output ?? '').trim();
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  const noFilePhrases = [
    '看不到', '無法看到', '無法讀取', '沒有收到', '沒有檔案', '沒有附件', '未提供', '未上傳',
    "can't see", 'cannot see', 'no file', 'no attachment', 'i don\'t have access', "i don't have",
    'not provided', 'without the file', '沒有提供', '無法取得', '無法辨識', '沒有圖', '沒有圖檔',
    '沒有圖片', '沒有文件', '沒有文件檔', '沒有pdf', '沒有上傳', '請提供檔案', '請上傳',
  ];
  const hasNoFile = noFilePhrases.some((p) => text.includes(p) || lower.includes(p.toLowerCase()));
  if (hasNoFile) return 'LLM';
  const docContentPhrases = [
    '所有權人', '所有權', '姓名', '地號', '建號', '權利範圍', '面積', '坐落', '謄本',
    '土地', '建物', '持分', '登記', '所有權人姓名', '所有權人為', '解析出', '根據檔案',
    '根據文件', '根據您提供的', '從檔案中', '從文件中', '文件中顯示', '檔案內容',
  ];
  const hasDocContent = docContentPhrases.some((p) => text.includes(p));
  if (hasDocContent) return 'VLM';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Status display
// ---------------------------------------------------------------------------

export function inferStatusOverrideFromBatchEntry(entry: BatchResultEntry): DisplayStatusOverride {
  if (!entry.success) return 'not_working';
  const category = detectCategoryFromOutput(entry.output);
  if (category === 'VLM') return 'vlm_ok';
  if (category === 'LLM') return 'llm_ok';
  return hasVisionCapability(entry.key) ? 'vlm_ok' : 'llm_ok';
}

export function getStatusOverrideOptions(isOcrMode: boolean): { value: DisplayStatusOverride; label: string }[] {
  const vlmLabel = isOcrMode ? 'OCR可用' : 'OCR 可用';
  return [
    { value: 'vlm_ok', label: vlmLabel },
    { value: 'llm_ok', label: 'LLM 可用' },
    { value: 'not_working', label: '不可用' },
    { value: 'untested', label: '尚未測試' },
  ];
}

export function getStatusDisplayByType(type: DisplayStatusOverride, isOcrMode: boolean): StatusDisplay {
  const vlmLabel = isOcrMode ? 'OCR可用' : 'OCR 可用';
  const map: Record<DisplayStatusOverride, StatusDisplay> = {
    vlm_ok: { type: 'vlm_ok', label: vlmLabel, title: `手動設定：${vlmLabel}` },
    llm_ok: { type: 'llm_ok', label: 'LLM 可用', title: '手動設定：LLM 可用' },
    working: { type: 'working', label: '通用模型可用', title: '手動設定：通用模型可用' },
    not_working: { type: 'not_working', label: '不可用', title: '手動設定：不可用' },
    untested: { type: 'untested', label: '尚未測試', title: '手動設定：尚未測試' },
  };
  return map[type];
}

export function getStatusDisplay(
  key: string,
  ev: ModelEvaluation | undefined,
  testResultByKey: Record<string, boolean>,
  outputByKey: Record<string, string>,
  isOcrMode: boolean
): StatusDisplay {
  if (ev?.display_status_override) return getStatusDisplayByType(ev.display_status_override, isOcrMode);

  const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
  const sessionSuccess = testResultByKey[key];
  const persistedWorking = ev?.is_working;
  const success = sessionSuccess === true || (sessionSuccess !== false && persistedWorking);

  const isVisionModel = hasVisionCapability(key);

  if (!outputText) {
    if (success) {
      if (isVisionModel)
        return {
          type: 'vlm_ok',
          label: isOcrMode ? 'OCR可用' : 'OCR 可用',
          title: 'API 連線成功，依模型靜態定義具 vision 能力，判定為 OCR 可用',
        };
      return { type: 'llm_ok', label: 'LLM 可用', title: 'API 連線成功，依模型靜態定義無 vision 能力，判定為 LLM 可用' };
    }
    if (sessionSuccess === false || (ev && !ev.is_working))
      return { type: 'not_working', label: '不可用', title: '測試失敗或未通過' };
    return { type: 'untested', label: '未測試', title: '尚未執行檔案解析測試' };
  }

  const category = detectCategoryFromOutput(outputText);
  if (category === 'VLM' && success)
    return {
      type: 'vlm_ok',
      label: isOcrMode ? 'OCR可用' : 'OCR 可用',
      title: '依本測試輸出：已成功解析檔案內容，視為 OCR 可用',
    };
  if (category === 'LLM' && success)
    return { type: 'llm_ok', label: 'LLM 可用', title: '依本測試輸出：有文字回應但未解析檔案，僅算 LLM 可用' };
  if (category === 'unknown' && success) {
    if (isVisionModel)
      return {
        type: 'vlm_ok',
        label: isOcrMode ? 'OCR可用' : 'OCR 可用',
        title: 'API 有回應，輸出無法明確推斷，依模型靜態定義具 vision 能力，暫判定為 OCR 可用',
      };
    return { type: 'llm_ok', label: 'LLM 可用', title: 'API 有回應，輸出無法明確推斷，依模型靜態定義無 vision 能力，判定為 LLM 可用' };
  }
  return { type: 'not_working', label: '不可用', title: '測試失敗或無有效輸出' };
}

// ---------------------------------------------------------------------------
// Batch report persistence
// ---------------------------------------------------------------------------

export function readRecentBatchReport(): RecentBatchReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_RECENT_BATCH_REPORT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentBatchReport>;
    if (!Array.isArray(parsed.entries)) return null;
    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      total: typeof parsed.total === 'number' ? parsed.total : parsed.entries.length,
      succeeded: typeof parsed.succeeded === 'number' ? parsed.succeeded : parsed.entries.filter((r) => !!r?.success).length,
      failed: typeof parsed.failed === 'number' ? parsed.failed : parsed.entries.filter((r) => !r?.success).length,
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

export function writeRecentBatchReport(report: RecentBatchReport): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(LS_RECENT_BATCH_REPORT, JSON.stringify(report));
    return true;
  } catch {
    return false;
  }
}
