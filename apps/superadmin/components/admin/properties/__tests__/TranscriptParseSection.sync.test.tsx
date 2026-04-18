// filepath: apps/superadmin/components/admin/properties/__tests__/TranscriptParseSection.sync.test.tsx
// TDD: 解析設定與 API 金鑰與模型設定 #ocr 頁面「使用者選定的 models」即時同步

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptParseSection } from '../TranscriptParseSection';
import type { SavedModule } from '@/lib/hooks/useAISettings';

jest.mock('@/lib/hooks/useAISettings');
jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn().mockResolvedValue({ parsedResult: null, consensusMetadata: null }),
}));

const useAISettings = jest.requireMock('@/lib/hooks/useAISettings').useAISettings as jest.MockedFunction<typeof import('@/lib/hooks/useAISettings').useAISettings>;

async function renderAndFlush(ui: React.ReactElement) {
  const view = render(ui);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

function buildOcrParseModule(assigned: Array<{ provider: string; model: string; priority?: number }>): SavedModule {
  return {
    id: 'mod-ocr-parse',
    module_key: 'online_ocr_parse',
    is_enabled: true,
    assigned_provider: assigned[0]?.provider ?? null,
    assigned_model: assigned[0]?.model ?? null,
    assigned_models: assigned.map((a, i) => ({
      provider: a.provider,
      model: a.model,
      priority: a.priority ?? i + 1,
    })),
    config: {},
  };
}

const OCR_PARSE_TWO = buildOcrParseModule([
  { provider: 'openai', model: 'gpt-4o', priority: 1 },
  { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 2 },
]);

const OCR_PARSE_THREE = buildOcrParseModule([
  { provider: 'openai', model: 'gpt-4o', priority: 1 },
  { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 2 },
  { provider: 'google', model: 'gemini-2.0-flash', priority: 3 },
]);

const baseReturn = {
  userId: 'test-user-id',
  modules: [OCR_PARSE_TWO] as SavedModule[],
  prompts: [],
  keys: [],
  models: [],
  evaluations: [],
  validationCacheByKeyId: {},
  validationSummary: { validatedCount: 0, totalModels: 0, updatedAt: null },
  loading: false,
  error: null,
  saveKey: jest.fn(),
  deleteKey: jest.fn(),
  validateKey: jest.fn(),
  revealKey: jest.fn().mockResolvedValue({ plaintext: '', ttlSeconds: 0 }),
  saveModels: jest.fn(),
  saveModule: jest.fn(),
  savePrompt: jest.fn(),
  deletePrompt: jest.fn(),
  saveEvaluations: jest.fn(),
  exportSettings: jest.fn(),
  importSettings: jest.fn(),
  clearAll: jest.fn(),
  saveValidationSummary: jest.fn(),
  testModel: jest.fn(),
  refresh: jest.fn().mockResolvedValue(undefined),
  refreshSilent: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  useAISettings.mockReturnValue({ ...baseReturn, modules: [OCR_PARSE_TWO] });
});

describe('TranscriptParseSection — 解析設定與 OCR 設定同步', () => {
  it('displays parser models from online_ocr_parse assigned_models (single source of truth)', async () => {
    await renderAndFlush(<TranscriptParseSection transcriptDocs={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    // Parser list is the first ul (second list is judge model); ensure 2 parser items from OCR parse module
    const lists = screen.getAllByRole('list');
    const parserList = lists.find((ul) => ul.className.includes('max-h-40')) ?? lists[0];
    expect(parserList.querySelectorAll('li')).toHaveLength(2);
    expect(parserList.textContent).toMatch(/openai/);
    expect(parserList.textContent).toMatch(/anthropic/);
  });

  it('when opening 解析設定 panel, calls refreshSilent so list syncs with OCR settings page', async () => {
    const refreshSilent = jest.fn().mockResolvedValue(undefined);
    useAISettings.mockReturnValue({ ...baseReturn, modules: [OCR_PARSE_TWO], refreshSilent });

    await renderAndFlush(<TranscriptParseSection transcriptDocs={[]} />);

    expect(refreshSilent).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    expect(refreshSilent).toHaveBeenCalledTimes(2);
  });

  it('after refreshSilent returns updated modules, parser list shows new assigned_models', async () => {
    let currentModules: SavedModule[] = [OCR_PARSE_TWO];
    let callCount = 0;
    const refreshSilent = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount >= 2) {
        currentModules = [OCR_PARSE_THREE];
        useAISettings.mockReturnValue({ ...baseReturn, modules: currentModules, refreshSilent });
      }
      return Promise.resolve();
    });
    useAISettings.mockImplementation(() => ({ ...baseReturn, modules: currentModules, refreshSilent }));

    const { rerender } = await renderAndFlush(<TranscriptParseSection transcriptDocs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    expect(refreshSilent).toHaveBeenCalled();
    // After refresh, hook returns new modules; rerender to simulate state update from useAISettings
    useAISettings.mockReturnValue({ ...baseReturn, modules: [OCR_PARSE_THREE], refreshSilent: baseReturn.refreshSilent });
    rerender(<TranscriptParseSection transcriptDocs={[]} />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText(/google \/ gemini-2.0-flash/)).toBeInTheDocument();
  });

  it('shows link to OCR tab for single source of truth', async () => {
    await renderAndFlush(<TranscriptParseSection transcriptDocs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    const link = screen.getByRole('link', { name: /OCR 解析設定/ });
    expect(link).toHaveAttribute('href', '/superadmin/settings/api_key_and_model_setting#ocr');
  });
});
