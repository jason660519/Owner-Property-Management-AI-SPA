import { describe, it, expect } from '@jest/globals';
import { getTotalAvailableModels, getSelectedCountInAvailable } from './total-available-models';
import type { KeyValidationResult } from '@/lib/hooks/useAISettings';

describe('getTotalAvailableModels', () => {
  it('returns 0 when no validation results', () => {
    const keys = [{ id: 'key-1', provider: 'openai' }];
    expect(getTotalAvailableModels({}, keys)).toBe(0);
  });

  it('returns 0 when currentKeys is empty (e.g. after deleting all keys)', () => {
    const results: Record<string, KeyValidationResult> = {
      'key-openai': { valid: true, message: 'ok', availableModels: Array(100).fill('gpt-4') },
    };
    expect(getTotalAvailableModels(results, [])).toBe(0);
  });

  it('counts only results for keys that still exist in currentKeys', () => {
    const openaiKeyId = 'key-openai';
    const anthropicKeyId = 'key-anthropic';
    const results: Record<string, KeyValidationResult> = {
      [openaiKeyId]: { valid: true, message: 'ok', availableModels: Array(100).fill('gpt-4') },
      [anthropicKeyId]: { valid: true, message: 'ok', availableModels: Array(78).fill('claude-3') },
    };
    const allKeys = [
      { id: openaiKeyId, provider: 'openai' },
      { id: anthropicKeyId, provider: 'anthropic' },
    ];
    expect(getTotalAvailableModels(results, allKeys)).toBe(100 + 78);

    // 刪除 OpenAI 金鑰後，只應計入 anthropic 的 78
    const keysAfterDeleteOpenAI = [{ id: anthropicKeyId, provider: 'anthropic' }];
    expect(getTotalAvailableModels(results, keysAfterDeleteOpenAI)).toBe(78);
  });

  it('per provider takes max when multiple keys for same provider', () => {
    const results: Record<string, KeyValidationResult> = {
      'key-openai-1': { valid: true, message: 'ok', availableModels: Array(50).fill('m') },
      'key-openai-2': { valid: true, message: 'ok', availableModels: Array(100).fill('m') },
    };
    const keys = [
      { id: 'key-openai-1', provider: 'openai' },
      { id: 'key-openai-2', provider: 'openai' },
    ];
    expect(getTotalAvailableModels(results, keys)).toBe(100);
  });
});

describe('getSelectedCountInAvailable', () => {
  it('returns null when no validation results', () => {
    const saved = [{ provider: 'openai', model_id: 'gpt-4' }];
    const keys = [{ id: 'k1', provider: 'openai' }];
    expect(getSelectedCountInAvailable(saved, {}, keys)).toBe(null);
  });

  it('counts only saved models that are in the available list (已選 ≤ 可選)', () => {
    const results: Record<string, KeyValidationResult> = {
      'key-openai': {
        valid: true,
        message: 'ok',
        availableModels: ['gpt-4', 'gpt-3.5-turbo'],
      },
    };
    const keys = [{ id: 'key-openai', provider: 'openai' }];
    const saved = [
      { provider: 'openai', model_id: 'gpt-4' },
      { provider: 'openai', model_id: 'gpt-3.5-turbo' },
      { provider: 'openai', model_id: 'gpt-999' },
    ];
    expect(getSelectedCountInAvailable(saved, results, keys)).toBe(2);
  });
});
