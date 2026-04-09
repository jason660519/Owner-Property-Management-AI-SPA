import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptParseSection } from '../TranscriptParseSection';
import type { SavedModule } from '@/lib/hooks/useAISettings';

jest.mock('@/lib/hooks/useAISettings');
jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn().mockResolvedValue({ parsedResult: null, consensusMetadata: null }),
}));

// Mock listSavedPrompts — the async state update from void-promise pattern is not
// reliably testable with act(). We test the UI structure and fallback behaviour instead.
jest.mock('@/app/superadmin/settings/evaluations-global-test/promptActions', () => ({
  listSavedPrompts: jest.fn().mockResolvedValue({ data: [] }),
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

describe('TranscriptParseSection — Prompt display (SSoT)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAISettings.mockReturnValue({ ...baseReturn });
  });

  it('shows read-only prompt display with link to Prompt management', async () => {
    await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

    // Expand settings panel
    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    // Should show prompt section title
    expect(screen.getByText('此次解析 Prompt')).toBeInTheDocument();

    // Should have link to prompt management page
    const link = screen.getByText('前往 Prompt 管理編輯');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/superadmin/settings/prompt-management');

    // Should NOT have an editable textarea for prompt
    expect(screen.queryByPlaceholderText(/留空則使用/)).not.toBeInTheDocument();
  });

  it('shows hardcoded fallback name when no saved prompts are loaded', async () => {
    await renderAndFlush(
      <TranscriptParseSection
        transcriptDocs={[TRANSCRIPT_DOC]}
        parseScenarioKey="single_building_number"
      />,
    );

    // Expand settings panel
    const btn = screen.getByRole('button', { name: /解析設定/i });
    expect(btn).toBeInTheDocument();
    await act(async () => { fireEvent.click(btn); });

    // Verify the panel expanded — look for the prompt section title
    expect(screen.getByText('此次解析 Prompt')).toBeInTheDocument();
    // With empty saved_prompts, prompt name should fall back to hardcoded
    expect(screen.getByText('系統預設（硬編碼）')).toBeInTheDocument();
  });

  it('has link to prompt management page in the settings panel', async () => {
    await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

    fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

    const links = screen.getAllByText(/前往 Prompt 管理/);
    expect(links.length).toBeGreaterThan(0);
    const promptMgmtLink = links[0].closest('a');
    expect(promptMgmtLink).toHaveAttribute('href', '/superadmin/settings/prompt-management');
    expect(promptMgmtLink).toHaveAttribute('target', '_blank');
  });
});
