// filepath: apps/superadmin/components/ai-settings/__tests__/ModelEvaluator.filter-persist.test.tsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelEvaluator, type ModelEvaluatorProps } from '../ModelEvaluator';
import type { SavedKey } from '@/lib/hooks/useAISettings';

const SS_STATUSES_KEY = 'ai-eval-filter:statuses';
const SS_PROVIDERS_KEY = 'ai-eval-filter:providerIds';

const baseProps: ModelEvaluatorProps = {
  savedKeys: [],
  savedModels: [],
  savedEvaluations: [],
  validateAllResultsByKeyId: {},
  currentKeys: [],
  onSave: jest.fn(),
  onTestModel: jest.fn(),
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

// ── Batch test + filter interaction test data ─────────────────────────────

const TOGETHER = 'together' as const;
const TOGETHER_KEY_ID = 'key-together-1';
const TOGETHER_MODEL_A = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const TOGETHER_MODEL_B = 'Qwen/Qwen2.5-72B-Instruct-Turbo';

const togetherKey: SavedKey = {
  id: TOGETHER_KEY_ID,
  provider: TOGETHER,
  is_valid: true,
  last_validated_at: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

/** Props that simulate a validated Together AI key with 2 available models */
const togetherProps: ModelEvaluatorProps = {
  ...baseProps,
  savedKeys: [togetherKey],
  savedModels: [
    { id: 'm1', provider: TOGETHER, model_id: TOGETHER_MODEL_A, model_name: 'Llama 3.3 70B', is_primary: true },
    { id: 'm2', provider: TOGETHER, model_id: TOGETHER_MODEL_B, model_name: 'Qwen 2.5 72B', is_primary: false },
  ],
  currentKeys: [{ id: TOGETHER_KEY_ID, provider: TOGETHER }],
  validateAllResultsByKeyId: {
    [TOGETHER_KEY_ID]: {
      valid: true,
      message: 'OK',
      availableModels: [TOGETHER_MODEL_A, TOGETHER_MODEL_B],
    },
  },
  onTestModel: jest.fn().mockResolvedValue({ success: true, output: 'Test output from model' }),
  onSave: jest.fn().mockResolvedValue(undefined),
};

// ── Feature 3: filter state sessionStorage persistence ────────────────────

describe('Feature 3: filter sessionStorage persistence', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  // ── filterStatuses ─────────────────────────────────────────────────────

  it('shows 分類與狀態 (default) when sessionStorage has no filter', () => {
    render(<ModelEvaluator {...baseProps} />);
    // The button label when no status filter is active
    expect(screen.getByTitle('依分類與狀態篩選（可複選）')).toHaveTextContent('分類與狀態');
  });

  it('restores filterStatuses from sessionStorage on mount (single value)', () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['vlm_ok']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依分類與狀態篩選（可複選）');
    expect(btn).toHaveTextContent('VLM可用');
  });

  it('restores filterStatuses from sessionStorage on mount (multiple values)', () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['vlm_ok', 'not_working']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依分類與狀態篩選（可複選）');
    expect(btn).toHaveTextContent('分類與狀態 2');
  });

  it('strips deprecated "working" value from sessionStorage on mount', () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['vlm_ok', 'working', 'not_working']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依分類與狀態篩選（可複選）');
    expect(btn).toHaveTextContent('分類與狀態 2');
  });

  it('writes filterStatuses to sessionStorage when user selects a status', async () => {
    render(<ModelEvaluator {...baseProps} />);

    fireEvent.click(screen.getByTitle('依分類與狀態篩選（可複選）'));
    const checkbox = screen.getByRole('checkbox', { name: 'LLM可用' });
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const stored = sessionStorage.getItem(SS_STATUSES_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('llm_ok');
  });

  it('clears filterStatuses in sessionStorage when user deselects all statuses', async () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['llm_ok']));
    render(<ModelEvaluator {...baseProps} />);

    fireEvent.click(screen.getByTitle('依分類與狀態篩選（可複選）'));
    const checkbox = screen.getByRole('checkbox', { name: 'LLM可用' });
    await act(async () => {
      fireEvent.click(checkbox); // deselect
    });

    const stored = sessionStorage.getItem(SS_STATUSES_KEY);
    expect(JSON.parse(stored!)).toEqual([]);
  });

  // ── filterProviderIds ──────────────────────────────────────────────────

  it('shows 全部公司 (default) when sessionStorage has no provider filter', () => {
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依公司篩選（可複選）');
    expect(btn).toHaveTextContent('全部公司');
  });

  it('restores filterProviderIds (multiple values) from sessionStorage on mount', () => {
    sessionStorage.setItem(SS_PROVIDERS_KEY, JSON.stringify(['openai', 'anthropic']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依公司篩選（可複選）');
    // Two providers → shows "已選 2 項"
    expect(btn).toHaveTextContent('已選 2 項');
  });
});

// ── Feature 4: batch test auto-clears status/category filters ─────────────
// Regression: after batch test on e.g. Together AI, filterStatuses='untested'
// causes rowsAfterStatusFilter=0 because all models are now tested. Page appears stuck.

describe('Feature 4: batch test resets status filter so results stay visible', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => sessionStorage.clear());

  it('filterStatuses button shows "分類與狀態" (i.e. reset to []) after batch test completes', async () => {
    // Pre-condition: user had status filter set to "untested" before running batch test
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['untested']));

    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...togetherProps}
        headerActionsRef={mockHeaderActionsRef}
        globalTestPrompt="Remove pillow from image"
      />
    );

    // Verify filter starts as 'untested' (restored from sessionStorage)
    expect(screen.getByTitle('依分類與狀態篩選（可複選）')).toHaveTextContent('尚未測試');

    // Wait for headerActionsRef to receive runBatchTest
    await waitFor(() => {
      const lastCall = mockHeaderActionsRef.mock.calls.at(-1)?.[0];
      expect(lastCall?.runBatchTest).toBeDefined();
    });

    // Run batch test
    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    // After batch test, filterStatuses must be cleared so models are visible
    await waitFor(() => {
      expect(screen.getByTitle('依分類與狀態篩選（可複選）')).toHaveTextContent('分類與狀態');
    });
  });

  it('sessionStorage for filterStatuses is reset to [] after batch test completes', async () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['untested']));

    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...togetherProps}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      expect(mockHeaderActionsRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    await waitFor(() => {
      const stored = sessionStorage.getItem(SS_STATUSES_KEY);
      expect(JSON.parse(stored ?? '[]')).toEqual([]);
    });
  });

  it('filterProviderIds is NOT reset after batch test (provider selection should persist)', async () => {
    // Provider filter staying on 'together' is intentional user selection — do not clear
    sessionStorage.setItem(SS_PROVIDERS_KEY, JSON.stringify([TOGETHER]));

    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...togetherProps}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      expect(mockHeaderActionsRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    // Provider filter should still be 'together' after batch test
    await waitFor(() => {
      const stored = sessionStorage.getItem(SS_PROVIDERS_KEY);
      expect(JSON.parse(stored ?? '[]')).toContain(TOGETHER);
    });
  });
});
