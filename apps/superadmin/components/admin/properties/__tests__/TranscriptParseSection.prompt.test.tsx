// filepath: apps/superadmin/components/admin/properties/__tests__/TranscriptParseSection.prompt.test.tsx
// TDD: 雲端解析謄本 — prompt 框框行為驗證
// Bug: fetchSystemPrompt 使用 prompt_text (錯誤欄位，應為 prompt_content)
// → 導致 AI 設定中儲存的 Prompt 無法被 API 讀取，始終使用預設 Prompt

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptParseSection } from '../TranscriptParseSection';
import type { SavedModule, SavedPrompt } from '@/lib/hooks/useAISettings';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/hooks/useAISettings');
jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn().mockResolvedValue({ parsedResult: null, consensusMetadata: null }),
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

const CUSTOM_PROMPT_TEXT = '我是自訂 Prompt，請解析謄本並傳回 JSON。';

function buildStoredPrompt(content: string, version = 1): SavedPrompt {
  return {
    id: `prompt-${version}`,
    module_key: 'online_ocr_parse',
    provider: 'anthropic',
    prompt_name: 'default',
    prompt_content: content,
    version,
  };
}

const OCR_MODULE = buildOcrParseModule([
  { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 1 },
]);

const TRANSCRIPT_DOC = {
  id: 'doc-abc',
  documentName: '102AF006705_土地謄本.pdf',
  documentType: 'transcript' as const,
  fileUrl: '',
  filePath: '102AF006705.pdf',
  fileSize: 12345,
  mimeType: 'application/pdf',
  uploadedAt: new Date().toISOString(),
  isActive: true,
  description: null,
};

const baseReturn = {
  userId: 'test-user-id',
  modules: [OCR_MODULE] as SavedModule[],
  prompts: [] as SavedPrompt[],
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Capture the last request body sent to fetch
let capturedBody: Record<string, unknown> = {};
let fetchWasCalled = false;

describe('TranscriptParseSection — prompt 框框行為', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedBody = {};
    fetchWasCalled = false;
    useAISettings.mockReturnValue({ ...baseReturn });

    // Mock fetch: capture body then return 400 (no ReadableStream needed).
    // Component guard: `if (!response.ok || !response.body) { setParseError(...); return; }`
    // → parse aborts cleanly without needing a stream.
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      fetchWasCalled = true;
      if (options?.body) {
        try {
          capturedBody = JSON.parse(options.body as string) as Record<string, unknown>;
        } catch {
          // ignore
        }
      }
      return new Response(null, { status: 400 });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. 預填 Prompt 顯示 ──────────────────────────────────────────────────

  describe('1. 預填 Prompt 顯示', () => {
    it('若 prompts 陣列為空，textarea 應顯示系統預設 Prompt', () => {
      useAISettings.mockReturnValue({ ...baseReturn, prompts: [] });
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim()).toBe(TRANSCRIPT_PARSE_PROMPT.trim());
    });

    it('若 prompts 有 online_ocr_parse 的 prompt_content，textarea 顯示該 prompt', () => {
      useAISettings.mockReturnValue({
        ...baseReturn,
        prompts: [buildStoredPrompt(CUSTOM_PROMPT_TEXT)],
      });
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim()).toBe(CUSTOM_PROMPT_TEXT.trim());
    });

    it('textarea 有顯示 prompt 內容（不是空的）', () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim().length).toBeGreaterThan(0);
    });
  });

  // ── 2. 使用者未修改 prompt → 不傳 customPrompt ──────────────────────────

  describe('2. 使用者未修改 prompt (not dirty)', () => {
    it('不修改 prompt 直接解析時，API body 不應含 customPrompt（伺服器端從 DB 取得）', async () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析謄本/i }));
      });

      expect(fetchWasCalled).toBe(true);
      // customPrompt should not be sent — server fetches stored prompt directly from DB
      expect(capturedBody.customPrompt).toBeUndefined();
    });

    it('開啟設定面板但未修改 prompt，不應顯示「此次解析將使用你剛修改的 Prompt」警告', () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      expect(
        screen.queryByText(/此次解析將使用你剛修改的 Prompt/i),
      ).not.toBeInTheDocument();
    });
  });

  // ── 3. 使用者修改 prompt → 傳送 customPrompt ────────────────────────────

  describe('3. 使用者修改 prompt (dirty)', () => {
    it('修改 textarea 後點解析，API body 應含 customPrompt', async () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i);
      fireEvent.change(textarea, { target: { value: CUSTOM_PROMPT_TEXT } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析謄本/i }));
      });

      expect(fetchWasCalled).toBe(true);
      expect(capturedBody.customPrompt).toBe(CUSTOM_PROMPT_TEXT.trim());
    });

    it('修改 textarea 後，顯示「此次解析將使用你剛修改的 Prompt」警告', () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      const differentContent = textarea.value + ' 額外修改';
      fireEvent.change(textarea, { target: { value: differentContent } });

      expect(
        screen.getByText(/此次解析將使用你剛修改的 Prompt/i),
      ).toBeInTheDocument();
    });

    it('修改 textarea 後，customPrompt 傳送修改後的文字', async () => {
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const editedPrompt = '已修改的測試 Prompt 內容 2025';
      const textarea = screen.getByPlaceholderText(/留空則使用/i);
      fireEvent.change(textarea, { target: { value: editedPrompt } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析謄本/i }));
      });

      expect(capturedBody.customPrompt).toBe(editedPrompt.trim());
    });
  });

  // ── 4. Prompt 優先順序邏輯驗證 ───────────────────────────────────────────

  describe('4. stored prompt 顯示優先順序', () => {
    it('AI 設定中有 prompt_content 時，textarea 應優先顯示該內容（而非系統預設）', () => {
      const storedContent = '自定義謄本解析 Prompt — AI 設定中儲存版';
      useAISettings.mockReturnValue({
        ...baseReturn,
        prompts: [buildStoredPrompt(storedContent)],
      });

      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim()).toBe(storedContent.trim());
      // Must NOT fall back to hardcoded default
      expect(textarea.value).not.toContain('請根據我提供的台灣建物或土地謄本');
    });

    it('AI 設定中沒有儲存 prompt 時，textarea 顯示系統預設 TRANSCRIPT_PARSE_PROMPT', () => {
      useAISettings.mockReturnValue({ ...baseReturn, prompts: [] });
      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim()).toBe(TRANSCRIPT_PARSE_PROMPT.trim());
    });

    it('選取最高版本的 prompt (version 最大值)', () => {
      const oldPrompt = buildStoredPrompt('舊版 Prompt v1', 1);
      const newPrompt = buildStoredPrompt('新版 Prompt v2', 2);

      useAISettings.mockReturnValue({
        ...baseReturn,
        prompts: [oldPrompt, newPrompt],
      });

      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);
      fireEvent.click(screen.getByRole('button', { name: /解析設定/i }));

      const textarea = screen.getByPlaceholderText(/留空則使用/i) as HTMLTextAreaElement;
      expect(textarea.value.trim()).toBe('新版 Prompt v2');
    });
  });

  // ── 5. API 請求 body 結構驗證 ────────────────────────────────────────────

  describe('5. API 請求 body 結構', () => {
    it('解析時 body 包含正確的 documentId 和 userId', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      render(<TranscriptParseSection transcriptDocs={[TRANSCRIPT_DOC]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /雲端解析謄本/i }));
      });

      expect(fetchSpy).toHaveBeenCalled();
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/transcript-parse/stream');
      expect(capturedBody.documentId).toBe(TRANSCRIPT_DOC.id);
      expect(capturedBody.userId).toBe('test-user-id');
    });

    it('未選擇文件時，解析按鈕 disabled，不呼叫 API', () => {
      render(<TranscriptParseSection transcriptDocs={[]} />);

      const btn = screen.getByRole('button', { name: /雲端解析謄本/i });
      expect(btn).toBeDisabled();
      expect(fetchWasCalled).toBe(false);
    });
  });
});
