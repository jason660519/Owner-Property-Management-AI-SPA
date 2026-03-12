/**
 * 與 ModelEvaluator 一致的狀態判定，供單一物件頁「OCR可用」數量與設定頁篩選同步。
 */

import type { ModelEvaluation } from '@/lib/hooks/useAISettings';
import { hasVisionCapability } from '@/lib/utils/vision-capability';

export type DisplayStatusOverride = 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested';

export type StatusDisplay = {
  type: 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested';
  label: string;
  title: string;
};

function detectCategoryFromOutput(output: string | undefined): 'VLM' | 'LLM' | 'unknown' {
  const text = (output ?? '').trim();
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  const noFilePhrases = [
    '看不到', '無法看到', '無法讀取', '沒有收到', '沒有檔案', '沒有附件', '未提供', '未上傳',
    "can't see", 'cannot see', 'no file', 'no attachment', "i don't have access", "i don't have",
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

/**
 * 依測試輸出判定狀態。單一物件頁僅有 persisted ev，無 session testResultByKey/outputByKey，
 * 故傳入 {} 與 ev?.notes，結果與設定頁「篩選 OCR可用」一致。
 */
export function getStatusDisplay(
  key: string,
  ev: ModelEvaluation | undefined,
  testResultByKey: Record<string, boolean>,
  outputByKey: Record<string, string>,
  isOcrMode: boolean
): StatusDisplay {
  if (ev?.display_status_override) {
    const vlmLabel = isOcrMode ? 'OCR可用' : 'OCR 可用';
    const map: Record<DisplayStatusOverride, StatusDisplay> = {
      vlm_ok: { type: 'vlm_ok', label: vlmLabel, title: `手動設定：${vlmLabel}` },
      llm_ok: { type: 'llm_ok', label: 'LLM 可用', title: '手動設定：LLM 可用' },
      working: { type: 'working', label: '通用模型可用', title: '手動設定：通用模型可用' },
      not_working: { type: 'not_working', label: '不可用', title: '手動設定：不可用' },
      untested: { type: 'untested', label: '尚未測試', title: '手動設定：尚未測試' },
    };
    return map[ev.display_status_override];
  }

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
