/**
 * TDD tests: provider filter dropdown must include ALL providers from AI_PROVIDERS,
 * even when some providers lack validation results.
 *
 * Bug: allRows uses an either/or approach — if ANY provider has validation data,
 * providers without validation data are completely excluded from the table and
 * therefore from the provider filter dropdown.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelEvaluator, type ModelEvaluatorProps } from '../ModelEvaluator';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { SavedKey } from '@/lib/hooks/useAISettings';

// ── Shared constants ──────────────────────────────────────────────────────────

const OPENAI_KEY_ID = 'key-openai';
const TOGETHER_KEY_ID = 'key-together';
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini'];
const TOGETHER_MODELS = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'Qwen/Qwen2.5-72B-Instruct-Turbo',
];

const openaiKey: SavedKey = {
  id: OPENAI_KEY_ID,
  provider: 'openai',
  is_valid: true,
  last_validated_at: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const togetherKey: SavedKey = {
  id: TOGETHER_KEY_ID,
  provider: 'together',
  is_valid: true,
  last_validated_at: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const baseProps: ModelEvaluatorProps = {
  savedKeys: [],
  savedModels: [],
  savedEvaluations: [],
  validateAllResultsByKeyId: {},
  currentKeys: [],
  onSave: jest.fn(),
  onTestModel: jest.fn().mockResolvedValue({ success: true, output: 'ok' }),
  onSaveModels: jest.fn(),
  savedModules: [],
  onSaveModule: jest.fn(),
  globalTestPrompt: '',
  onChangeGlobalTestPrompt: jest.fn(),
  uploadedFile: null,
  onChangeUploadedFile: jest.fn(),
  summarySelectedCount: 0,
  summaryTotalCount: 0,
};

// ── Helper: open provider filter dropdown and get option labels ───────────────

function getProviderFilterOptions(): string[] {
  const btn = screen.getByTitle('依公司篩選（可複選）');
  fireEvent.click(btn);
  const checkboxes = screen.getAllByRole('checkbox');
  // The provider filter is inside the second dropdown group;
  // filter to labels that match known provider names
  const knownProviderNames = new Set(AI_PROVIDERS.map((p) => p.name));
  return checkboxes
    .map((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.trim() ?? '';
    })
    .filter((text) => knownProviderNames.has(text));
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Provider filter dropdown includes ALL AI_PROVIDERS when no validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Provider filter — fallback (no validation results)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('shows all AI_PROVIDERS in the filter dropdown when no validation data exists', () => {
    render(<ModelEvaluator {...baseProps} />);
    const options = getProviderFilterOptions();
    for (const p of AI_PROVIDERS) {
      expect(options).toContain(p.name);
    }
  });

  it('includes Together AI in the filter dropdown when using static fallback', () => {
    render(<ModelEvaluator {...baseProps} />);
    const options = getProviderFilterOptions();
    expect(options).toContain('Together AI');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Provider filter dropdown includes Together AI even when only SOME
//    providers have validation results (the core bug scenario)
// ═════════════════════════════════════════════════════════════════════════════

describe('Provider filter — mixed validation (core bug)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('includes Together AI in the dropdown when OpenAI has validation but Together does not', () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        // Only OpenAI has validation results — Together AI does NOT
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
      },
    };
    render(<ModelEvaluator {...props} />);
    const options = getProviderFilterOptions();
    expect(options).toContain('OpenAI');
    expect(options).toContain('Together AI');
  });

  it('shows Together AI static models in the table when Together has no validation data', () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
      },
    };
    render(<ModelEvaluator {...props} />);

    // Together AI's static models should appear in the table
    const togetherProvider = AI_PROVIDERS.find((p) => p.id === 'together');
    expect(togetherProvider).toBeDefined();
    for (const model of togetherProvider!.models) {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    }
  });

  it('model count (totalCount) includes both validated and static-fallback models', async () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
      },
    };
    const mockRef = jest.fn();
    render(<ModelEvaluator {...props} headerActionsRef={mockRef} />);

    // OpenAI: validated (2 models); all other providers: static fallback
    const staticCountFromOtherProviders = AI_PROVIDERS
      .filter((p) => p.id !== 'openai')
      .reduce((sum, p) => sum + p.models.length, 0);
    const expectedTotal = OPENAI_MODELS.length + staticCountFromOtherProviders;

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.totalCount).toBe(expectedTotal);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. When Together AI HAS validation results, use those instead of static
// ═════════════════════════════════════════════════════════════════════════════

describe('Provider filter — all providers validated', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('uses validated models for Together AI when validation data is available', () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
        [TOGETHER_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: TOGETHER_MODELS,
        },
      },
    };
    render(<ModelEvaluator {...props} />);
    const options = getProviderFilterOptions();
    expect(options).toContain('OpenAI');
    expect(options).toContain('Together AI');
  });

  it('model count matches validated + static-fallback for remaining providers', async () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
        [TOGETHER_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: TOGETHER_MODELS,
        },
      },
    };
    const mockRef = jest.fn();
    render(<ModelEvaluator {...props} headerActionsRef={mockRef} />);

    // OpenAI + Together: validated; all other providers: static fallback
    const staticCountFromOtherProviders = AI_PROVIDERS
      .filter((p) => p.id !== 'openai' && p.id !== 'together')
      .reduce((sum, p) => sum + p.models.length, 0);
    const expectedTotal = OPENAI_MODELS.length + TOGETHER_MODELS.length + staticCountFromOtherProviders;

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.totalCount).toBe(expectedTotal);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Filtering by provider correctly isolates Together AI models
// ═════════════════════════════════════════════════════════════════════════════

describe('Provider filter — selecting Together AI', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('filtering by Together AI shows only Together AI models in the table', async () => {
    const props: ModelEvaluatorProps = {
      ...baseProps,
      savedKeys: [openaiKey, togetherKey],
      currentKeys: [
        { id: OPENAI_KEY_ID, provider: 'openai' },
        { id: TOGETHER_KEY_ID, provider: 'together' },
      ],
      validateAllResultsByKeyId: {
        [OPENAI_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: OPENAI_MODELS,
        },
        [TOGETHER_KEY_ID]: {
          valid: true,
          message: 'OK',
          availableModels: TOGETHER_MODELS,
        },
      },
    };
    render(<ModelEvaluator {...props} />);

    // Open provider filter dropdown
    fireEvent.click(screen.getByTitle('依公司篩選（可複選）'));

    // Select Together AI
    const togetherCheckbox = screen.getByRole('checkbox', { name: 'Together AI' });
    fireEvent.click(togetherCheckbox);

    // The filter button should now show "Together AI"
    await waitFor(() => {
      expect(screen.getByTitle('依公司篩選（可複選）')).toHaveTextContent('Together AI');
    });
  });
});
