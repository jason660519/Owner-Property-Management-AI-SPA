// Tests for ModelResearchReport — covers empty state, validated-models join,
// disclaimer banner, missing-key warning, generation flow, and source link
// security attributes.

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelResearchReport, type ResearchReport } from '../ModelResearchReport';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';

// Mock MarkdownViewer to avoid pulling in remark/rehype during test
jest.mock('@/components/docs/MarkdownViewer', () => ({
  MarkdownViewer: ({ content }: { content: string }) => (
    <div data-testid="markdown-viewer">{content}</div>
  ),
}));

// Mock EnhancedTable so we can introspect rows without needing TanStack runtime
// to render every nuance. We render rows as a simple table with the first
// `model` cell visible — enough to assert presence/absence and click ⟳.
jest.mock('@/components/ui/EnhancedTable', () => {
  const Mock = <T extends object>(props: {
    data: T[];
    columns: { id?: string; header?: string; cell?: (ctx: { row: { original: T } }) => React.ReactNode }[];
  }) => (
    <table data-testid="mock-enhanced-table">
      <thead>
        <tr>
          {props.columns.map((c, i) => (
            <th key={i}>{typeof c.header === 'string' ? c.header : ''}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.data.map((row, idx) => (
          <tr key={idx} data-testid="mock-row">
            {props.columns.map((c, i) => (
              <td key={i}>{c.cell ? c.cell({ row: { original: row } }) : ''}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  return { __esModule: true, default: Mock };
});

const ANTHROPIC = 'anthropic' as const;

const validAnthropicKey: SavedKey = {
  id: 'key-anthropic',
  provider: ANTHROPIC,
  is_valid: true,
  last_validated_at: '2026-04-01T00:00:00Z',
  is_active: true,
  created_at: '2026-04-01T00:00:00Z',
};

const validationResults: Record<string, KeyValidationResult> = {
  'key-anthropic': {
    valid: true,
    message: 'OK',
    availableModels: ['claude-opus-4-6', 'claude-sonnet-4-6'],
  },
};

const sampleReport: ResearchReport = {
  id: 'r1',
  user_id: 'user-1',
  provider: 'anthropic',
  model_id: 'claude-opus-4-6',
  model_name: 'Claude Opus 4.6',
  company_name: 'Anthropic',
  version_label: '4.6',
  input_price_per_1m: 15,
  output_price_per_1m: 75,
  context_window: 200000,
  knowledge_cutoff: '2024-04',
  capabilities: ['text', 'vision', 'tool_use'],
  source_urls: ['https://anthropic.com/pricing', 'https://anthropic.com/claude'],
  report_markdown: '## Anthropic Claude Opus 4.6\n\n世界級的 LLM。',
  generator_model: 'claude-opus-4-6',
  generator_provider: 'anthropic',
  generation_status: 'done',
  generation_error: null,
  generated_at: '2026-04-10T00:00:00Z',
  created_at: '2026-04-10T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
};

function mockFetchSequence(responses: Array<{ ok?: boolean; status?: number; json: unknown }>) {
  const fn = jest.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
    });
  }
  return fn;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ModelResearchReport', () => {
  it('shows empty state when there are no validated models', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[]}
        validateAllResultsByKeyId={{}}
        currentKeys={[]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('尚無已驗證模型')).toBeInTheDocument();
    });
  });

  it('renders disclaimer banner', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/免責聲明/);
      expect(screen.getByRole('alert')).toHaveTextContent(/僅供參考/);
    });
  });

  it('shows warning when no evaluator key is configured', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/請先在「API 金鑰管理」設定並驗證至少一個支援網路搜尋的評審金鑰/)
      ).toBeInTheDocument();
    });
  });

  it('joins validated models with reports — model with report shows price', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [sampleReport] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      // Anthropic appears for every validated model row, so use getAllByText
      expect(screen.getAllByText('Anthropic').length).toBeGreaterThanOrEqual(1);
    });
    // Cells now show PLAIN numbers ("15.00", "75.00") — the "$" and "K"
    // units live in the column headers ("Input (USD/1M)", "Context (tokens)")
    // so TanStack can sort the raw number natively. Context window is
    // rendered with toLocaleString, so 200000 → "200,000".
    expect(screen.getByText('15.00')).toBeInTheDocument();
    expect(screen.getByText('75.00')).toBeInTheDocument();
    expect(screen.getByText('200,000')).toBeInTheDocument();
  });

  it('shows "尚未生成" for validated models without a report', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('尚未生成').length).toBeGreaterThan(0);
    });
  });

  it('calls generate API when ⟳ button is clicked', async () => {
    const fetchMock = mockFetchSequence([
      { json: { reports: [] } }, // initial fetch
      { json: { reports: [sampleReport] } }, // generate response
      { json: { reports: [sampleReport] } }, // refetch after generate
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('尚未生成').length).toBeGreaterThan(0);
    });

    // Find the first generate button by title
    const generateButtons = screen.getAllByTitle('生成報告');
    expect(generateButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(generateButtons[0]);
    });

    await waitFor(() => {
      const generateCall = fetchMock.mock.calls.find(([url]) =>
        typeof url === 'string' && url.includes('/api/ai-settings/model-research/generate')
      );
      expect(generateCall).toBeDefined();
    });
  });

  it('renders evaluator provider/model dropdowns filtered by validated keys', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    const providerSelect = await screen.findByLabelText('評審廠商');
    const modelSelect = screen.getByLabelText('評審模型');

    expect(providerSelect).toBeInTheDocument();
    expect(modelSelect).toBeInTheDocument();
    expect((providerSelect as HTMLSelectElement).value).toBe('anthropic');
    // Provider dropdown only contains the user's validated providers (just anthropic here)
    expect(providerSelect.querySelectorAll('option')).toHaveLength(1);
    // Model dropdown lists Anthropic models from EVALUATOR_CATALOG
    const modelOptions = Array.from(modelSelect.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(modelOptions).toContain('claude-opus-4-6');
    expect(modelOptions).toContain('claude-sonnet-4-6');
  });

  it('sends the user-selected evaluator to the generate API', async () => {
    const fetchMock = mockFetchSequence([
      { json: { reports: [] } },
      { json: { reports: [sampleReport] } },
      { json: { reports: [sampleReport] } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    const modelSelect = await screen.findByLabelText('評審模型');
    fireEvent.change(modelSelect, { target: { value: 'claude-sonnet-4-6' } });

    const generateButtons = screen.getAllByTitle('生成報告');
    await act(async () => {
      fireEvent.click(generateButtons[0]);
    });

    await waitFor(() => {
      const generateCall = fetchMock.mock.calls.find(([url]) =>
        typeof url === 'string' && url.includes('/api/ai-settings/model-research/generate')
      );
      expect(generateCall).toBeDefined();
      const body = JSON.parse((generateCall![1] as RequestInit).body as string);
      expect(body.evaluatorProvider).toBe('anthropic');
      expect(body.evaluatorModel).toBe('claude-sonnet-4-6');
    });
  });

  it('expanded report renders source links with safe target+rel attributes', async () => {
    global.fetch = mockFetchSequence([{ json: { reports: [sampleReport] } }]) as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Anthropic').length).toBeGreaterThanOrEqual(1);
    });

    // Click the expand button (aria-label "展開報告")
    const expandButtons = screen.getAllByLabelText('展開報告');
    fireEvent.click(expandButtons[0]);

    // The expanded panel renders MarkdownViewer + source links
    await waitFor(() => {
      expect(screen.getByTestId('markdown-viewer')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /anthropic\.com\/pricing/ });
    expect(link).toHaveAttribute('href', 'https://anthropic.com/pricing');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('shows error message when generate API fails', async () => {
    const fetchMock = mockFetchSequence([
      { json: { reports: [] } }, // initial fetch
      { ok: false, status: 400, json: { error: '請先設定並驗證 Anthropic 評審金鑰' } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ModelResearchReport
        savedKeys={[validAnthropicKey]}
        validateAllResultsByKeyId={validationResults}
        currentKeys={[{ id: 'key-anthropic', provider: ANTHROPIC }]}
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('尚未生成').length).toBeGreaterThan(0);
    });

    const generateButtons = screen.getAllByTitle('生成報告');
    await act(async () => {
      fireEvent.click(generateButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/請先設定並驗證 Anthropic 評審金鑰/)).toBeInTheDocument();
    });
  });
});
