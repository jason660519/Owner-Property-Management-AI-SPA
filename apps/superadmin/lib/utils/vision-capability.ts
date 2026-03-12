/**
 * 從 provider::model key 查詢是否具備 vision 能力。
 * 與 ModelEvaluator 的「OCR 可用」判定一致：先查靜態定義，若不在靜態列表則依 model ID 啟發式推斷。
 * 供 TranscriptParseSection 與設定頁 #ocr 的「篩選後可選模型數」同步使用。
 */

import { AI_PROVIDERS } from '@/lib/ai-providers';

export function hasVisionCapability(key: string): boolean {
  const [providerId, modelId] = key.split('::');
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  const model = provider?.models.find((m) => m.id === modelId);
  if (model) return model.capabilities?.includes('vision') ?? false;
  // 動態載入的模型（來自 API 驗證）不在靜態列表，以 model ID 啟發式推斷
  const lower = (modelId ?? '').toLowerCase();
  if (lower.includes('vision') || lower.includes('-vl-') || lower.includes('-vl ')) return true;
  // OpenAI / Anthropic / Gemini 的主力多模態模型通常含 vision（4o, claude-3, gemini）
  if (providerId === 'openai' && (lower.includes('gpt-4o') || lower.includes('gpt-4-turbo'))) return true;
  if (providerId === 'anthropic' && lower.includes('claude-3')) return true;
  if (providerId === 'gemini' && lower.includes('gemini')) return true;
  return false;
}
