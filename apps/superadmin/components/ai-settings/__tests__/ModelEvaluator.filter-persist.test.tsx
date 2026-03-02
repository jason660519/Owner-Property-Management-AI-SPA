// filepath: apps/superadmin/components/ai-settings/__tests__/ModelEvaluator.filter-persist.test.tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelEvaluator } from '../ModelEvaluator';

const SS_STATUSES_KEY = 'ai-eval-filter:statuses';
const SS_PROVIDERS_KEY = 'ai-eval-filter:providerIds';

const baseProps = {
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
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['working']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依分類與狀態篩選（可複選）');
    // Single-item filterStatuses => shows the readable label
    expect(btn).toHaveTextContent('通用模型可用');
  });

  it('restores filterStatuses from sessionStorage on mount (multiple values)', () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['working', 'not_working']));
    render(<ModelEvaluator {...baseProps} />);
    const btn = screen.getByTitle('依分類與狀態篩選（可複選）');
    expect(btn).toHaveTextContent('分類與狀態 2');
  });

  it('writes filterStatuses to sessionStorage when user selects a status', async () => {
    render(<ModelEvaluator {...baseProps} />);

    // Open the status filter dropdown
    fireEvent.click(screen.getByTitle('依分類與狀態篩選（可複選）'));
    // Check "通用模型可用" (value = 'working')
    const checkbox = screen.getByRole('checkbox', { name: '通用模型可用' });
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const stored = sessionStorage.getItem(SS_STATUSES_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('working');
  });

  it('clears filterStatuses in sessionStorage when user deselects all statuses', async () => {
    sessionStorage.setItem(SS_STATUSES_KEY, JSON.stringify(['working']));
    render(<ModelEvaluator {...baseProps} />);

    fireEvent.click(screen.getByTitle('依分類與狀態篩選（可複選）'));
    const checkbox = screen.getByRole('checkbox', { name: '通用模型可用' });
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
