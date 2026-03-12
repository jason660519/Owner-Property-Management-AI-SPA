/**
 * Tests for 統一prompt測試 (batch test) and 單一prompt測試 (single test) panels.
 *
 * TDD: these tests define expected behaviour before/after implementation fixes.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModelEvaluator, type ModelEvaluatorProps } from '../ModelEvaluator';
import type { SavedKey, SavedModel } from '@/lib/hooks/useAISettings';

// ── Shared test data ─────────────────────────────────────────────────────────

const ANTHROPIC = 'anthropic' as const;
const MODEL_ID = 'claude-3-5-haiku-20241022';
const MODEL_NAME = 'Claude 3.5 Haiku';
const KEY_ID = 'key-anthropic-1';

const OPENAI = 'openai' as const;
const OPENAI_MODEL_ID = 'gpt-4o';
const OPENAI_MODEL_NAME = 'GPT-4o';
const OPENAI_KEY_ID = 'key-openai-1';

const savedKeyValid: SavedKey = {
  id: KEY_ID,
  provider: ANTHROPIC,
  is_valid: true,
  last_validated_at: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const savedKeyOpenAI: SavedKey = {
  id: OPENAI_KEY_ID,
  provider: OPENAI,
  is_valid: true,
  last_validated_at: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const savedModelSelected: SavedModel = {
  id: 'model-anthropic-1',
  provider: ANTHROPIC,
  model_id: MODEL_ID,
  model_name: MODEL_NAME,
  is_primary: true,
};

const savedModelOpenAI: SavedModel = {
  id: 'model-openai-1',
  provider: OPENAI,
  model_id: OPENAI_MODEL_ID,
  model_name: OPENAI_MODEL_NAME,
  is_primary: true,
};

const currentKeys = [{ id: KEY_ID, provider: ANTHROPIC }];

const validateAllResultsByKeyId = {
  [KEY_ID]: {
    valid: true,
    message: 'OK',
    availableModels: [MODEL_ID],
  },
};

const mockOnTestModel = jest.fn();
const mockOnSave = jest.fn();

const baseProps: ModelEvaluatorProps = {
  savedKeys: [savedKeyValid],
  savedModels: [savedModelSelected],
  savedEvaluations: [],
  validateAllResultsByKeyId,
  currentKeys,
  onSave: mockOnSave,
  onTestModel: mockOnTestModel,
  onSaveModels: jest.fn(),
  savedModules: [],
  onSaveModule: jest.fn(),
  globalTestPrompt: 'Initial global prompt',
  onChangeGlobalTestPrompt: jest.fn(),
  uploadedFile: null,
  onChangeUploadedFile: jest.fn(),
  summarySelectedCount: 1,
  summaryTotalCount: 11,
};

/** Props with key but model NOT selected */
const propsNotSelected: ModelEvaluatorProps = {
  ...baseProps,
  savedModels: [], // not selected
};

/** Props with model selected but NO valid key */
const propsNoKey: ModelEvaluatorProps = {
  ...baseProps,
  savedKeys: [{ ...savedKeyValid, is_valid: false }],
};

/** Props with two providers and models for multi-model batch test scenarios */
const multiModelProps: ModelEvaluatorProps = {
  ...baseProps,
  savedKeys: [savedKeyValid, savedKeyOpenAI],
  savedModels: [savedModelSelected, savedModelOpenAI],
  currentKeys: [
    { id: KEY_ID, provider: ANTHROPIC },
    { id: OPENAI_KEY_ID, provider: OPENAI },
  ],
  validateAllResultsByKeyId: {
    [KEY_ID]: { valid: true, message: 'OK', availableModels: [MODEL_ID] },
    [OPENAI_KEY_ID]: { valid: true, message: 'OK', availableModels: [OPENAI_MODEL_ID] },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOnTestModel.mockResolvedValue({ success: true, output: 'Test response output' });
  mockOnSave.mockResolvedValue(undefined);
});

// ── Helper: find the single-test button in the row ───────────────────────────

/**
 * The FlaskConical button in the "單一prompt測試" column is a <button> element.
 * We locate it by title attribute which changes based on disabled reason.
 * allRows may include static models from all providers, so use queryAll and pick the first.
 */
function getSingleTestButton() {
  return (
    screen.queryAllByTitle('開啟單一測試設定（可調整 Prompt 與檔案）')[0] ??
    screen.queryAllByTitle('需先設定 API 金鑰')[0] ??
    screen.queryAllByTitle('請先勾選此模型才能測試')[0] ??
    null
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. 單一prompt測試 — Button enable/disable logic
// ═══════════════════════════════════════════════════════════════════════════

describe('單一prompt測試 — button enable/disable', () => {
  it('button is disabled when model is NOT in selected list (isSelected=false)', () => {
    render(<ModelEvaluator {...propsNotSelected} />);
    const btn = getSingleTestButton();
    expect(btn).not.toBeNull();
    expect(btn).toBeDisabled();
  });

  it('button title indicates "請先勾選" when model is not selected', () => {
    render(<ModelEvaluator {...propsNotSelected} />);
    const buttons = screen.getAllByTitle('請先勾選此模型才能測試');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeInTheDocument();
  });

  it('button is disabled when model is selected but provider has no valid key', () => {
    render(<ModelEvaluator {...propsNoKey} />);
    const btn = getSingleTestButton();
    expect(btn).not.toBeNull();
    expect(btn).toBeDisabled();
  });

  it('button title indicates "需先設定 API 金鑰" when key is missing', () => {
    render(<ModelEvaluator {...propsNoKey} />);
    expect(screen.getByTitle('需先設定 API 金鑰')).toBeInTheDocument();
  });

  it('button is ENABLED when model is selected AND provider has a valid key', () => {
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. 單一prompt測試 — Panel opens with correct prompt
// ═══════════════════════════════════════════════════════════════════════════

describe('單一prompt測試 — panel opens with effective prompt', () => {
  it('textarea shows globalTestPrompt when row has no custom prompt', async () => {
    render(<ModelEvaluator {...baseProps} globalTestPrompt="My global prompt" />);
    const btn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');

    await act(async () => {
      fireEvent.click(btn);
    });

    const textarea = screen.getByPlaceholderText(
      /預設為此列有效 Prompt/
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('My global prompt');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. 單一prompt測試 — Prompt real-time reactivity
// ═══════════════════════════════════════════════════════════════════════════

describe('單一prompt測試 — prompt 即時同步', () => {
  it('textarea updates when globalTestPrompt prop changes while panel is open (row uses global)', async () => {
    const { rerender } = render(
      <ModelEvaluator {...baseProps} globalTestPrompt="Prompt A" />
    );

    // Open the single test panel
    const btn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');
    await act(async () => {
      fireEvent.click(btn);
    });

    // Verify initial value
    const textarea = screen.getByPlaceholderText(/預設為此列有效 Prompt/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Prompt A');

    // Parent changes globalTestPrompt (e.g., user selects a saved prompt in the batch test Sheet)
    await act(async () => {
      rerender(<ModelEvaluator {...baseProps} globalTestPrompt="Prompt B — updated" />);
    });

    // Textarea should reflect the new global prompt
    expect(textarea.value).toBe('Prompt B — updated');
  });

  it('textarea does NOT update when user has manually edited it', async () => {
    const { rerender } = render(
      <ModelEvaluator {...baseProps} globalTestPrompt="Prompt A" />
    );

    // Open the panel
    const btn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');
    await act(async () => {
      fireEvent.click(btn);
    });

    const textarea = screen.getByPlaceholderText(/預設為此列有效 Prompt/) as HTMLTextAreaElement;

    // User manually edits the textarea
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'My custom edit' } });
    });
    expect(textarea.value).toBe('My custom edit');

    // Parent changes globalTestPrompt
    await act(async () => {
      rerender(<ModelEvaluator {...baseProps} globalTestPrompt="Prompt B — updated" />);
    });

    // Textarea should KEEP the user's edit, NOT be overridden
    expect(textarea.value).toBe('My custom edit');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. 單一prompt測試 — Test execution and output display
// ═══════════════════════════════════════════════════════════════════════════

describe('單一prompt測試 — test execution and output', () => {
  it('calls onTestModel with the prompt and closes/shows result after execution', async () => {
    render(<ModelEvaluator {...baseProps} globalTestPrompt="Test prompt content" />);

    // Open panel
    const openBtn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');
    await act(async () => {
      fireEvent.click(openBtn);
    });

    // Execute the test
    const runBtn = screen.getByRole('button', { name: /執行單一測試/ });
    await act(async () => {
      fireEvent.click(runBtn);
    });

    expect(mockOnTestModel).toHaveBeenCalledWith(
      ANTHROPIC,
      MODEL_ID,
      'Test prompt content',
      null
    );
  });

  it('displays test output inside the Sheet panel after execution', async () => {
    // userEvent.setup() properly handles async event handlers (wraps in act internally)
    const user = userEvent.setup();
    render(<ModelEvaluator {...baseProps} globalTestPrompt="Test prompt" />);

    // Open panel using userEvent for correct async handling
    const openBtn = screen.getByTitle('開啟單一測試設定（可調整 Prompt 與檔案）');
    await user.click(openBtn);

    // Execute the test — userEvent.click awaits all async state updates
    const runBtn = screen.getByRole('button', { name: /執行單一測試/ });
    await user.click(runBtn);

    // The output should appear both in the table row AND inside the Sheet panel.
    // getAllByText handles the case where the same text appears in multiple places.
    await waitFor(
      () => {
        const matches = screen.getAllByText('Test response output');
        // Verify at least one match is the Sheet panel's result div (green border class)
        const inSheet = matches.some(
          (el) => el.className.includes('rounded') && el.className.includes('border-green'),
        );
        expect(inSheet).toBe(true);
      },
      { timeout: 3000 },
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. 統一prompt測試 — Batch test canBatchTest exposed via headerActionsRef
// ═══════════════════════════════════════════════════════════════════════════

describe('統一prompt測試 — headerActionsRef canBatchTest', () => {
  it('calls headerActionsRef with canBatchTest: false when no models are selected', async () => {
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...propsNotSelected}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      // The last call should have canBatchTest: false (no selected models)
      const lastCall = mockHeaderActionsRef.mock.calls.at(-1)?.[0];
      expect(lastCall).toEqual(
        expect.objectContaining({ canBatchTest: false })
      );
    });
  });

  it('calls headerActionsRef with canBatchTest: true when models are selected and have valid keys', async () => {
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      const lastCall = mockHeaderActionsRef.mock.calls.at(-1)?.[0];
      expect(lastCall).toEqual(
        expect.objectContaining({ canBatchTest: true })
      );
    });
  });

  it('calls headerActionsRef with tooltip explaining why batch test is disabled when no models selected', async () => {
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...propsNotSelected}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      const lastCall = mockHeaderActionsRef.mock.calls.at(-1)?.[0];
      expect(lastCall?.tooltip).toContain('請先勾選');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. 統一prompt測試 — Batch test execution behavior
// ═══════════════════════════════════════════════════════════════════════════

describe('統一prompt測試 — batch test execution', () => {
  it('runBatchTest calls onTestModel for each selected model with a valid key', async () => {
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockHeaderActionsRef}
        globalTestPrompt="Batch prompt"
      />
    );

    await waitFor(() => {
      const lastCall = mockHeaderActionsRef.mock.calls.at(-1)?.[0];
      expect(lastCall?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      runBatchTest();
    });

    expect(mockOnTestModel).toHaveBeenCalledWith(ANTHROPIC, MODEL_ID, 'Batch prompt', null);
  });

  it('runBatchTest does NOT call onTestModel when no models are selected', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...propsNotSelected}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      expect(mockHeaderActionsRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      runBatchTest();
    });

    expect(mockOnTestModel).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('runBatchTest does NOT call onTestModel for models without valid API keys', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...propsNoKey}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => {
      expect(mockHeaderActionsRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      runBatchTest();
    });

    expect(mockOnTestModel).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('runBatchTest function reference is stable when currentKeys changes reference but not content', async () => {
    // This test guards against the infinite re-render loop:
    // page.tsx passes currentKeys={settings.keys.map(...)} which creates a new array on every render.
    // ModelEvaluator must expose a stable runBatchTest so headerActionsRef is not repeatedly called.
    const mockHeaderActionsRef = jest.fn();
    const { rerender } = render(
      <ModelEvaluator
        {...baseProps}
        currentKeys={[{ id: KEY_ID, provider: ANTHROPIC }]}
        headerActionsRef={mockHeaderActionsRef}
      />
    );

    await waitFor(() => expect(mockHeaderActionsRef).toHaveBeenCalled());

    const firstRunBatchTest = mockHeaderActionsRef.mock.calls[0][0].runBatchTest;

    // Simulate parent re-rendering with a new currentKeys array reference (same content)
    rerender(
      <ModelEvaluator
        {...baseProps}
        currentKeys={[{ id: KEY_ID, provider: ANTHROPIC }]}
        headerActionsRef={mockHeaderActionsRef}
      />
    );
    await act(async () => {});

    // Whether headerActionsRef was called again or not, the runBatchTest reference must be stable
    const latestRunBatchTest = mockHeaderActionsRef.mock.calls.at(-1)![0].runBatchTest;
    expect(latestRunBatchTest).toBe(firstRunBatchTest);
  });

  it('runBatchTest saves evaluation results to onSave after completion', async () => {
    const mockHeaderActionsRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockHeaderActionsRef}
        globalTestPrompt="Save test prompt"
      />
    );

    await waitFor(() => {
      expect(mockHeaderActionsRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockHeaderActionsRef.mock.calls.at(-1)![0];
    await act(async () => {
      runBatchTest();
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const savedItems = mockOnSave.mock.calls[0][0] as { provider: string; model_id: string; is_working: boolean }[];
    expect(savedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: ANTHROPIC,
          model_id: MODEL_ID,
          is_working: true,
        }),
      ])
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. 全部測試 — 防止重複觸發 (concurrent execution guard)
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — 防止重複觸發', () => {
  it('second runBatchTest call is ignored while first batch is still running', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    let resolveFirst!: (v: { success: boolean; output: string }) => void;
    mockOnTestModel.mockImplementation(
      () =>
        new Promise<{ success: boolean; output: string }>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Guard test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];

    // Fire first batch (async — pending until resolveFirst is called)
    const p1 = runBatchTest();

    // Immediately fire second batch — should be blocked by ref guard
    const p2 = runBatchTest();

    // onTestModel should have been called exactly once (from first batch)
    expect(mockOnTestModel).toHaveBeenCalledTimes(1);

    // Resolve and clean up
    resolveFirst({ success: true, output: 'Done' });
    await act(async () => {
      await p1;
      await p2;
    });

    alertMock.mockRestore();
  });

  it('allows a new batch after the previous one completes', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Sequential test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];

    // First batch — completes normally
    await act(async () => {
      await runBatchTest();
    });
    expect(mockOnTestModel).toHaveBeenCalledTimes(1);

    // Second batch — should work because the first one finished
    await act(async () => {
      await runBatchTest();
    });
    expect(mockOnTestModel).toHaveBeenCalledTimes(2);

    alertMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. 全部測試 — batchTesting 狀態轉換
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — batchTesting 狀態轉換', () => {
  it('batchTesting transitions false → true → false during execution', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    let resolveTest!: (v: { success: boolean; output: string }) => void;
    mockOnTestModel.mockImplementation(
      () =>
        new Promise<{ success: boolean; output: string }>((resolve) => {
          resolveTest = resolve;
        }),
    );

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Transition test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.batchTesting).toBe(false);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    let p: Promise<void>;
    act(() => {
      p = runBatchTest();
    });

    // After starting, batchTesting should become true
    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.batchTesting).toBe(true);
    });

    // Resolve test
    resolveTest({ success: true, output: 'OK' });
    await act(async () => {
      await p;
    });

    // After completing, batchTesting should be false again
    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.batchTesting).toBe(false);
    });

    alertMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. 全部測試 — 完成摘要 (completion summary)
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — 完成摘要', () => {
  it('shows batch results modal with success count after batch completes', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Summary test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.runBatchTest).toBeDefined();
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    // BatchResultsModal should appear with success summary
    await waitFor(() => {
      expect(screen.getByText(/成功/)).toBeInTheDocument();
    });
    // Confirm success count = 1 and failure = 0
    expect(screen.getByText(/1 成功/)).toBeInTheDocument();
    expect(screen.getByText(/0 失敗/)).toBeInTheDocument();
  });

  it('shows batch results modal with both success and failure counts for mixed results', async () => {
    mockOnTestModel
      .mockResolvedValueOnce({ success: true, output: 'Anthropic OK' })
      .mockResolvedValueOnce({ success: false, message: 'Rate limit exceeded' });

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...multiModelProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Mixed results"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    // BatchResultsModal should show 1 success and 1 failure
    await waitFor(() => {
      expect(screen.getByText(/1 成功/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 失敗/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. 全部測試 — 部分失敗仍正確儲存成功結果
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — 部分失敗仍儲存', () => {
  it('saves only successful results when some models fail', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    mockOnTestModel
      .mockResolvedValueOnce({ success: true, output: 'Anthropic OK' })
      .mockRejectedValueOnce(new Error('Network error'));

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...multiModelProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Partial failure"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    // onSave should still be called with the successful result
    expect(mockOnSave).toHaveBeenCalled();
    const savedItems = mockOnSave.mock.calls[0][0] as Array<{
      provider: string;
      model_id: string;
      is_working: boolean;
    }>;
    expect(savedItems.length).toBeGreaterThanOrEqual(1);
    expect(savedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ is_working: true }),
      ]),
    );

    alertMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. 全部測試 — 多供應商多模型並行
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — 多供應商多模型並行', () => {
  it('calls onTestModel for each selected model from multiple providers', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...multiModelProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Multi-model test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    expect(mockOnTestModel).toHaveBeenCalledTimes(2);

    const calls = mockOnTestModel.mock.calls;
    const calledProviders = calls.map((c: unknown[]) => c[0]);
    expect(calledProviders).toContain(ANTHROPIC);
    expect(calledProviders).toContain(OPENAI);

    alertMock.mockRestore();
  });

  it('saves all successful results from multiple providers in one batch', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    mockOnTestModel
      .mockResolvedValueOnce({ success: true, output: 'Anthropic OK' })
      .mockResolvedValueOnce({ success: true, output: 'OpenAI OK' });

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...multiModelProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Multi-save test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      await runBatchTest();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const savedItems = mockOnSave.mock.calls[0][0] as Array<{
      provider: string;
      model_id: string;
      is_working: boolean;
    }>;
    expect(savedItems).toHaveLength(2);
    expect(savedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: ANTHROPIC, model_id: MODEL_ID, is_working: true }),
        expect.objectContaining({ provider: OPENAI, model_id: OPENAI_MODEL_ID, is_working: true }),
      ]),
    );

    alertMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. 全部測試 — batchProgress 進度追蹤
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — batchProgress 進度追蹤', () => {
  it('exposes batchProgress = null initially via headerActionsRef', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...baseProps} headerActionsRef={mockRef} />,
    );

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.batchProgress).toBeNull();
    });
  });

  it('exposes batchProgress with total > 0 during execution', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    let resolveTest!: (v: { success: boolean; output: string }) => void;
    mockOnTestModel.mockImplementation(
      () =>
        new Promise<{ success: boolean; output: string }>((resolve) => {
          resolveTest = resolve;
        }),
    );

    const mockRef = jest.fn();
    render(
      <ModelEvaluator
        {...baseProps}
        headerActionsRef={mockRef}
        globalTestPrompt="Progress test"
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.canBatchTest).toBe(true);
    });

    const { runBatchTest } = mockRef.mock.calls.at(-1)![0];
    let p: Promise<void>;
    act(() => {
      p = runBatchTest();
    });

    // During execution, batchProgress should have total > 0
    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.batchProgress).toBeTruthy();
      expect(last?.batchProgress?.total).toBeGreaterThan(0);
    });

    resolveTest({ success: true, output: 'Done' });
    await act(async () => {
      await p;
    });

    // After completion, batchProgress resets to null
    await waitFor(() => {
      expect(mockRef.mock.calls.at(-1)?.[0]?.batchProgress).toBeNull();
    });

    alertMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. 全部測試 — testableCount 可測試模型數量
// ═══════════════════════════════════════════════════════════════════════════

describe('全部測試 — testableCount 可測試模型數量', () => {
  it('testableCount equals 1 when 1 model is selected and has a valid key', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...baseProps} headerActionsRef={mockRef} />,
    );

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.testableCount).toBe(1);
    });
  });

  it('testableCount equals 0 when models are selected but no valid key exists', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...propsNoKey} headerActionsRef={mockRef} />,
    );

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.testableCount).toBe(0);
    });
  });

  it('testableCount equals 0 when no models are selected', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...propsNotSelected} headerActionsRef={mockRef} />,
    );

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.testableCount).toBe(0);
    });
  });

  it('testableCount equals 2 with two providers and both models selected', async () => {
    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...multiModelProps} headerActionsRef={mockRef} />,
    );

    await waitFor(() => {
      const last = mockRef.mock.calls.at(-1)?.[0];
      expect(last?.testableCount).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. 套用最近報告 — 成功後 alert 顯示共更新／變更／不變筆數
// ═══════════════════════════════════════════════════════════════════════════

const LS_RECENT_BATCH_REPORT = 'ai-eval:last-batch-report';

describe('套用最近報告 — 說明共更新幾筆、變更幾筆、不變幾筆', () => {
  let alertMock: jest.SpyInstance;
  let localStorageGet: jest.Mock;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    localStorageGet = jest.fn();
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: localStorageGet,
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    alertMock.mockRestore();
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('套用成功後 alert 包含「共更新 X 筆」「變更 Y 筆」「不變 Z 筆」', async () => {
    const report = {
      savedAt: new Date().toISOString(),
      total: 2,
      succeeded: 1,
      failed: 1,
      entries: [
        {
          key: `${ANTHROPIC}::${MODEL_ID}`,
          providerId: ANTHROPIC,
          providerName: 'Anthropic',
          modelId: MODEL_ID,
          modelName: MODEL_NAME,
          success: true,
          output: 'VLM response',
        },
        {
          key: `${OPENAI}::${OPENAI_MODEL_ID}`,
          providerId: OPENAI,
          providerName: 'OpenAI',
          modelId: OPENAI_MODEL_ID,
          modelName: OPENAI_MODEL_NAME,
          success: false,
          output: 'Error',
        },
      ],
    };
    localStorageGet.mockImplementation((key: string) => {
      if (key === LS_RECENT_BATCH_REPORT) return JSON.stringify(report);
      return null;
    });

    const mockRef = jest.fn();
    const savedEvals = [
      {
        provider: ANTHROPIC,
        model_id: MODEL_ID,
        model_name: MODEL_NAME,
        is_working: false,
        specialties: ['general'],
        is_candidate: false,
        notes: 'old',
        last_tested_at: null,
      },
    ];
    render(
      <ModelEvaluator
        {...baseProps}
        savedEvaluations={savedEvals}
        headerActionsRef={mockRef}
      />,
    );

    await waitFor(() => {
      expect(mockRef.mock.calls.length).toBeGreaterThan(0);
      expect(mockRef.mock.calls.at(-1)?.[0]?.applyRecentBatchReport).toBeDefined();
    });

    const { applyRecentBatchReport } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      applyRecentBatchReport();
    });

    expect(alertMock).toHaveBeenCalled();
    const alertMsg = alertMock.mock.calls.find((c: string[]) =>
      typeof c[0] === 'string' && c[0].includes('共更新') && c[0].includes('變更') && c[0].includes('不變')
    )?.[0] as string | undefined;
    expect(alertMsg).toBeDefined();
    expect(alertMsg).toMatch(/共更新\s*2\s*筆/);
    expect(alertMsg).toMatch(/變更\s*\d+\s*筆/);
    expect(alertMsg).toMatch(/不變\s*\d+\s*筆/);
  });

  it('全部為新筆時變更數等於更新數、不變為 0', async () => {
    const report = {
      savedAt: new Date().toISOString(),
      total: 1,
      succeeded: 1,
      failed: 0,
      entries: [
        {
          key: `${ANTHROPIC}::${MODEL_ID}`,
          providerId: ANTHROPIC,
          providerName: 'Anthropic',
          modelId: MODEL_ID,
          modelName: MODEL_NAME,
          success: true,
          output: 'OK',
        },
      ],
    };
    localStorageGet.mockImplementation((key: string) => {
      if (key === LS_RECENT_BATCH_REPORT) return JSON.stringify(report);
      return null;
    });

    const mockRef = jest.fn();
    render(
      <ModelEvaluator {...baseProps} savedEvaluations={[]} headerActionsRef={mockRef} />,
    );

    await waitFor(() => expect(mockRef.mock.calls.at(-1)?.[0]?.applyRecentBatchReport).toBeDefined());
    const { applyRecentBatchReport } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      applyRecentBatchReport();
    });

    const alertMsg = alertMock.mock.calls.at(-1)?.[0] as string;
    expect(alertMsg).toMatch(/共更新\s*1\s*筆/);
    expect(alertMsg).toMatch(/變更\s*1\s*筆/);
    expect(alertMsg).toMatch(/不變\s*0\s*筆/);
  });

  it('既有資料與報告一致時變更為 0、不變等於更新數', async () => {
    const report = {
      savedAt: new Date().toISOString(),
      total: 1,
      succeeded: 1,
      failed: 0,
      entries: [
        {
          key: `${ANTHROPIC}::${MODEL_ID}`,
          providerId: ANTHROPIC,
          providerName: 'Anthropic',
          modelId: MODEL_ID,
          modelName: MODEL_NAME,
          success: true,
          output: 'same',
        },
      ],
    };
    localStorageGet.mockImplementation((key: string) => {
      if (key === LS_RECENT_BATCH_REPORT) return JSON.stringify(report);
      return null;
    });

    const mockRef = jest.fn();
    const savedEvals = [
      {
        provider: ANTHROPIC,
        model_id: MODEL_ID,
        model_name: MODEL_NAME,
        is_working: true,
        specialties: ['vision'],
        is_candidate: false,
        notes: 'same',
        last_tested_at: report.savedAt,
      },
    ];
    render(
      <ModelEvaluator
        {...baseProps}
        savedEvaluations={savedEvals}
        headerActionsRef={mockRef}
      />,
    );

    await waitFor(() => expect(mockRef.mock.calls.at(-1)?.[0]?.applyRecentBatchReport).toBeDefined());
    const { applyRecentBatchReport } = mockRef.mock.calls.at(-1)![0];
    await act(async () => {
      applyRecentBatchReport();
    });

    const alertMsg = alertMock.mock.calls.at(-1)?.[0] as string;
    expect(alertMsg).toMatch(/共更新\s*1\s*筆/);
    expect(alertMsg).toMatch(/變更\s*0\s*筆/);
    expect(alertMsg).toMatch(/不變\s*1\s*筆/);
  });
});
