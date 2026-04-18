// filepath: apps/superadmin/components/admin/properties/__tests__/TranscriptParseSection.prompt.test.tsx
// Tests for the SSoT prompt display (read-only) and API request behaviour.
// After the SSoT refactor, the transcript page no longer has an editable prompt
// textarea — it shows a read-only preview and sends parseScenarioKey to the API.

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptParseSection } from '../TranscriptParseSection';
import type { SavedModule } from '@/lib/hooks/useAISettings';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/hooks/useAISettings');
jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn().mockResolvedValue({ parsedResult: null, consensusMetadata: null }),
}));
jest.mock('@/app/superadmin/settings/evaluations-global-test/promptActions', () => ({
  listSavedPrompts: jest.fn().mockResolvedValue({ data: [] }),
}));

const useAISettings = jest.requireMock('@/lib/hooks/useAISettings')
  .useAISettings as jest.MockedFunction<typeof import('@/lib/hooks/useAISettings').useAISettings>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function renderAndFlush(ui: React.ReactElement) {
  const view = render(ui);
  await act(async () => { await Promise.resolve(); });
  return view;
}

const OCR_MODULE = buildOcrParseModule([
  { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 1 },
]);

const TRANSCRIPT_DOC = {
  id: 'doc-abc',
  documentName: '102AF006705_土地謄本.pdf',
  documentType: 'transcript',
  filePath: '102AF006705.pdf',
  url: '/api/documents/doc-abc/view',
};

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let capturedBody: Record<string, unknown> = {};
let fetchWasCalled = false;

describe('TranscriptParseSection — prompt SSoT behaviour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedBody = {};
    fetchWasCalled = false;
    localStorage.clear();
    sessionStorage.clear();
    useAISettings.mockReturnValue({ ...baseReturn });

    jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const href = typeof url === 'string' ? url : String(url);
      if (href.includes('/api/transcript-parse/jobs/') && options?.method !== 'POST') {
        return Response.json({
          id: 'job-test-1',
          status: 'succeeded',
          phaseMessage: null,
          progress: [],
          errorMessage: null,
          propertyDocumentId: TRANSCRIPT_DOC.id,
        });
      }
      if (options?.method === 'POST' && href.includes('/api/transcript-parse/jobs')) {
        fetchWasCalled = true;
        if (options?.body) {
          try {
            capturedBody = JSON.parse(options.body as string) as Record<string, unknown>;
          } catch { /* ignore */ }
        }
        return Response.json({ jobId: 'job-test-1' });
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Read-only display ──────────────────────────────────────────────────

  describe('1. Read-only prompt display', () => {
    it('shows prompt section title without editable textarea', async () => {
      await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      expect(screen.getByText('此次解析 Prompt')).toBeInTheDocument();
      // No editable textarea
      expect(screen.queryByPlaceholderText(/留空則使用/i)).not.toBeInTheDocument();
    });

    it('does not show override warning (removed)', async () => {
      await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      expect(
        screen.queryByText(/此次解析將使用你剛修改的 Prompt/i),
      ).not.toBeInTheDocument();
    });
  });

  // ── 2. API request sends parseScenarioKey ─────────────────────────────────

  describe('2. API request sends parseScenarioKey', () => {
    it('sends parseScenarioKey instead of customPrompt when parsing', async () => {
      await renderAndFlush(
        <TranscriptParseSection
          transcriptDocs={[TRANSCRIPT_DOC]}
          parseScenarioKey="single_building_number"
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析.*謄本/i }));
      });

      expect(fetchWasCalled).toBe(true);
      expect(capturedBody.parseScenarioKey).toBe('single_building_number');
      expect(capturedBody.customPrompt).toBeUndefined();
    });

    it('sends documentId and userId in the request body', async () => {
      await renderAndFlush(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析.*謄本/i }));
      });

      expect(fetchWasCalled).toBe(true);
      expect(capturedBody.documentId).toBe(TRANSCRIPT_DOC.id);
      expect(capturedBody.userId).toBe('test-user-id');
    });

    it('disables parse button when no document is selected', async () => {
      await renderAndFlush(<TranscriptParseSection transcriptDocs={[]} />);

      const btn = screen.getByRole('button', { name: /雲端解析.*謄本/i });
      expect(btn).toBeDisabled();
      expect(fetchWasCalled).toBe(false);
    });
  });
});
