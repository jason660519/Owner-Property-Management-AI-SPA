// filepath: apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/settings-persist.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Heavy dependency mocks ─────────────────────────────────────────────────
jest.mock('@/components/ai-settings', () => ({
  ApiKeyManager: React.forwardRef((_props: object, _ref: React.Ref<unknown>) => (
    <div data-testid="api-key-manager" />
  )),
  ModelEvaluator: React.forwardRef(
    (
      {
        globalTestPrompt,
        onChangeGlobalTestPrompt,
      }: {
        globalTestPrompt: string;
        onChangeGlobalTestPrompt: (next: string) => void;
      },
      _ref: React.Ref<unknown>,
    ) => (
      <div data-testid="model-evaluator">
        <textarea
          placeholder="全域 Prompt"
          value={globalTestPrompt}
          onChange={(e) => onChangeGlobalTestPrompt((e.target as HTMLTextAreaElement).value)}
        />
      </div>
    ),
  ),
  FeatureModuleSelector: () => <div data-testid="feature-module-selector" />,
  ModelResearchReport: () => <div data-testid="model-research-report" />,
}));

jest.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children, fixedContent }: { children: React.ReactNode; fixedContent?: React.ReactNode }) => (
    <div>
      <div data-testid="fixed-content">{fixedContent}</div>
      {children}
    </div>
  ),
}));

const mockExportSettings = jest.fn();
const mockImportSettings = jest.fn();

jest.mock('@/lib/hooks/useAISettings', () => ({
  useAISettings: jest.fn(() => ({
    loading: false,
    error: null,
    keys: [],
    models: [],
    evaluations: [],
    modules: [],
    prompts: [],
    validationCacheByKeyId: {},
    validationSummary: { totalModels: 0 },
    saveKey: jest.fn(),
    deleteKey: jest.fn(),
    validateKey: jest.fn(),
    saveEvaluations: jest.fn(),
    testModel: jest.fn(),
    saveModels: jest.fn(),
    saveModule: jest.fn(),
    savePrompt: jest.fn(),
    deletePrompt: jest.fn(),
    exportSettings: mockExportSettings,
    importSettings: mockImportSettings,
    saveValidationSummary: jest.fn(),
    refresh: jest.fn(),
    refreshSilent: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

jest.mock('@/lib/utils/total-available-models', () => ({
  getTotalAvailableModels: jest.fn(() => 0),
  getSelectedCountInAvailable: jest.fn(() => null),
  getAvailableModelsList: jest.fn(() => []),
  getAvailableModelsListWithStaticFallback: jest.fn(() => []),
  getTotalAvailableModelsWithStaticFallback: jest.fn(() => 0),
}));

// model-evaluator/utils evaluates FEATURE_MODULES at module load, which trips
// when AI_PROVIDERS is mocked to []. Stub it out to keep page.tsx loadable.
jest.mock('@/components/ai-settings/model-evaluator/utils', () => ({
  getModelDisplayName: jest.fn((_p: string, m: string) => m),
}));

jest.mock('@/lib/ai-providers', () => ({
  getProviderById: jest.fn(),
  AI_PROVIDERS: [],
}));

jest.mock('@/lib/parse-env-keys', () => ({
  SUPPORTED_AI_ENV_KEY_NAMES: [],
}));

jest.mock('@/components/ai-settings/PromptManagerModal', () => ({
  PROMPT_LOAD_MESSAGE_TYPE: 'PROMPT_LOAD',
  PromptManagerModal: () => null,
}));

// ── Import page after mocks ────────────────────────────────────────────────
import AIServiceSettingsPage from '../page';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Switch to the ocr tab so the ModelEvaluator component is rendered */
function switchToModelEvaluatorTab() {
  const ocrTab = screen.getByRole('button', { name: /OCR解析設定/i });
  fireEvent.click(ocrTab);
}

// ── Feature 1: globalTestPrompt localStorage persistence ──────────────────

describe('Feature 1: globalTestPrompt localStorage persistence', () => {
  const LS_KEY = 'ai-settings:globalTestPrompt';

  beforeEach(() => {
    localStorage.clear();
    // jsdom resets hash between tests — simulate no hash
    window.location.hash = '';
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('initialises globalTestPrompt from localStorage when a value is stored', () => {
    const stored = 'My custom prompt for testing';
    localStorage.setItem(LS_KEY, JSON.stringify(stored));

    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    const textarea = screen.getByPlaceholderText(/全域 Prompt/i);
    expect((textarea as HTMLTextAreaElement).value).toBe(stored);
  });

  it('falls back to DEFAULT_EVALUATION_PROMPT when localStorage has no entry', () => {
    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    const textarea = screen.getByPlaceholderText(/全域 Prompt/i);
    // Default prompt starts with "請根據我提供的文件資料"
    expect((textarea as HTMLTextAreaElement).value).toMatch(/請根據我提供的文件資料/);
  });

  it('persists globalTestPrompt to localStorage when the user types', async () => {
    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    const textarea = screen.getByPlaceholderText(/全域 Prompt/i);
    fireEvent.change(textarea, { target: { value: 'Updated prompt' } });

    await waitFor(() => {
      const stored = localStorage.getItem(LS_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toBe('Updated prompt');
    });
  });

  it('overwrites previous localStorage value when user changes the prompt again', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify('Old value'));

    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    const textarea = screen.getByPlaceholderText(/全域 Prompt/i);
    fireEvent.change(textarea, { target: { value: 'Newer value' } });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEY)!)).toBe('Newer value');
    });
  });
});

// ── Feature 2: Export / Import settings buttons ───────────────────────────

describe('Feature 2: Export / Import settings buttons in ocr tab', () => {
  beforeEach(() => {
    localStorage.clear();
    mockExportSettings.mockReset();
    mockImportSettings.mockReset();
    window.location.hash = '';
  });

  it('renders 匯出設定 and 載入設定 buttons when ocr tab is active', () => {
    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    expect(screen.getByRole('button', { name: /匯出設定/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /載入設定/i })).toBeInTheDocument();
  });

  it('calls exportSettings and triggers file download when 匯出設定 is clicked', async () => {
    const fakeData = { keys: [], models: [] };
    mockExportSettings.mockResolvedValueOnce(fakeData);

    // Spy on URL.createObjectURL and document.createElement to detect download
    const createObjectURL = jest.fn(() => 'blob:fake-url');
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        jest.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy);
      }
      return el;
    });

    render(<AIServiceSettingsPage />);
    switchToModelEvaluatorTab();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /匯出設定/i }));
    });

    await waitFor(() => {
      expect(mockExportSettings).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    jest.restoreAllMocks();
  });

  it('does not render export/import buttons outside of model evaluator tabs', () => {
    render(<AIServiceSettingsPage />);
    // Default tab is 'keys'
    expect(screen.queryByRole('button', { name: /匯出設定/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /載入設定/i })).not.toBeInTheDocument();
  });
});
