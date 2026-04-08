import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptParseSection } from '../TranscriptParseSection';
import type { SavedModule } from '@/lib/hooks/useAISettings';

jest.mock('@/lib/hooks/useAISettings');
jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn().mockResolvedValue({ parsedResult: null, consensusMetadata: null }),
}));
jest.mock('@/components/ai-settings/PromptManagerModal', () => ({
  PROMPT_LOAD_MESSAGE_TYPE: 'PROMPT_LOAD',
  PromptManagerModal: ({
    transcriptParsePresets,
  }: {
    transcriptParsePresets?: Array<unknown>;
  }) => (
    <div data-testid="prompt-manager-modal">
      preset-count:{Array.isArray(transcriptParsePresets) ? transcriptParsePresets.length : 0}
    </div>
  ),
}));

const useAISettings = jest.requireMock('@/lib/hooks/useAISettings')
  .useAISettings as jest.MockedFunction<typeof import('@/lib/hooks/useAISettings').useAISettings>;

function buildOcrParseModule(
  assigned: Array<{ provider: string; model: string; priority?: number }>,
): SavedModule {
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

const OCR_MODULE = buildOcrParseModule([
  { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 1 },
]);

const baseReturn = {
  userId: 'test-user-id',
  modules: [OCR_MODULE] as SavedModule[],
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

const TRANSCRIPT_DOC = {
  id: 'doc-abc',
  documentName: '102AF006705_土地謄本.pdf',
  documentType: 'transcript',
  filePath: '102AF006705.pdf',
  url: '/api/documents/doc-abc/view',
};

async function renderAndFlush(ui: React.ReactElement) {
  const view = render(ui);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

describe('TranscriptParseSection — Prompt 管理情境預設', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAISettings.mockReturnValue({ ...baseReturn });
  });

  it('opens PromptManagerModal with 4 transcript scenario presets', async () => {
    await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));
    fireEvent.click(screen.getByRole('button', { name: /Prompt 管理/i }));

    expect(screen.getByTestId('prompt-manager-modal')).toHaveTextContent('preset-count:4');
  });
});
