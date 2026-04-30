'use client';

import type { AIProvider } from '@/lib/ai-providers';
import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

export type ImageToImageCapableModel = {
  providerId: AIProvider;
  modelId: string;
  modelName: string;
};

export const IMAGE_TO_IMAGE_CAPABLE_MODELS: ImageToImageCapableModel[] = [
  {
    providerId: 'gemini',
    modelId: 'gemini-3.1-flash-image-preview',
    modelName: 'Gemini Banana / Nano Banana 2',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3-pro-image-preview',
    modelName: 'Gemini Banana Pro',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash-image',
    modelName: 'Gemini Banana',
  },
  {
    providerId: 'openai',
    modelId: 'gpt-image-1',
    modelName: 'GPT Image 1',
  },
  {
    providerId: 'qwen',
    modelId: 'qwen-image-2.0-pro',
    modelName: 'Qwen Image 2.0 Pro',
  },
];

export function isImageToImageCapableModel(providerId: string, modelId: string): boolean {
  const lower = modelId.toLowerCase();
  if (providerId === 'gemini') return lower.includes('image');
  if (providerId === 'openai') return lower.startsWith('gpt-image') || lower === 'chatgpt-image-latest';
  if (providerId === 'qwen') return lower.startsWith('qwen-image');
  return false;
}

export function imageToImageDefaultModelsForActiveProviders(providerIds: Set<string>): ImageToImageCapableModel[] {
  return IMAGE_TO_IMAGE_CAPABLE_MODELS.filter((model) => (
    model.providerId === 'gemini' || providerIds.has(model.providerId)
  ));
}

export function imageToImageModelDisplayName(providerId: string, modelId: string): string | null {
  return IMAGE_TO_IMAGE_CAPABLE_MODELS.find((model) => (
    model.providerId === providerId && model.modelId === modelId
  ))?.modelName ?? null;
}

export function coerceUnsupportedImageToImageRows(
  rows: ImageToImageEvaluationRow[],
  modelOptions: Array<{ providerId: string; modelId: string }>,
): ImageToImageEvaluationRow[] {
  const fallback = modelOptions[0] ?? { providerId: 'gemini', modelId: 'gemini-3.1-flash-image-preview' };
  return rows.map((row) => {
    if (isImageToImageCapableModel(row.providerId, row.modelId)) return row;
    return {
      ...row,
      providerId: fallback.providerId,
      modelId: fallback.modelId,
      runStatus: 'idle',
      resultText: '',
      resultImageUrl: '',
      resultImage2dUrl: '',
      resultImage3dUrl: '',
      message: '已改用支援圖生圖輸出的模型。',
      runStartedAtMs: null,
      e2eMs: null,
      httpStatus: null,
    };
  });
}
