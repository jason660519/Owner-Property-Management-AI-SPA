/**
 * Tests for AgentModelAssignmentPanel:
 *   - Renders the left agent list grouped by category
 *   - Loads current assignments from the /agent-assignments endpoint
 *   - Switching agents swaps the right-side strategy form
 *   - Saving sends a PUT request with the correct payload
 *   - Recommendation panel filters by the selected agent's suggestedTagKeys
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentModelAssignmentPanel } from '../AgentModelAssignmentPanel';
import { AGENT_GROUPS } from '@/lib/ai/agent-registry';
import type { SavedKey, ModelEvaluation } from '@/lib/hooks/useAISettings';
import type { AgentAssignment } from '@/lib/types/agent-assignment';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

const savedKeys: SavedKey[] = [
  {
    id: 'key-anthropic',
    provider: 'anthropic',
    api_key_encrypted: '',
    is_active: true,
    is_valid: true,
  } as unknown as SavedKey,
  {
    id: 'key-openai',
    provider: 'openai',
    api_key_encrypted: '',
    is_active: true,
    is_valid: true,
  } as unknown as SavedKey,
];

const validateAllResultsByKeyId = {
  'key-anthropic': {
    valid: true,
    message: 'ok',
    availableModels: ['claude-opus-4-6', 'claude-sonnet-4-6'],
  },
  'key-openai': {
    valid: true,
    message: 'ok',
    availableModels: ['gpt-4o', 'gpt-5'],
  },
};

const evaluations: ModelEvaluation[] = [];

const initialAssignments: AgentAssignment[] = [
  {
    id: 'row-contract',
    agent_key: 'contract_assistant',
    is_enabled: true,
    primary_provider: 'anthropic',
    primary_model_id: 'claude-opus-4-6',
    primary_config: { temperature: 0.3 },
    fallbacks: [],
    guardrails: {},
    notes: null,
    updated_by: MOCK_USER_ID,
    updated_at: '2026-04-12T00:00:00Z',
    created_at: '2026-04-12T00:00:00Z',
  },
];

// Stub useModelRoleCatalog so the recommendation panel doesn't hit real APIs.
jest.mock('@/lib/hooks/useModelRoleCatalog', () => ({
  useModelRoleCatalog: () => ({
    rows: [
      {
        provider: 'anthropic',
        providerName: 'Anthropic',
        modelId: 'claude-opus-4-6',
        modelName: 'Claude Opus 4.6',
        version: '4.6',
        status: 'available',
        assignments: [{ tag_key: 'ad_copy_generation', source: 'manual', confidence: 1 }],
      },
      {
        provider: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        version: '4o',
        status: 'available',
        assignments: [{ tag_key: 'transcript_visual_parse', source: 'ai_online', confidence: 0.8 }],
      },
      {
        provider: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-5',
        modelName: 'GPT-5',
        version: '5',
        status: 'available',
        assignments: [],
      },
    ],
    roleTags: [],
    loading: false,
    classifyStatus: 'idle',
    classifyError: null,
    refresh: jest.fn(),
    classifyModels: jest.fn(),
    refreshAssignments: jest.fn(),
    saveManualAssignments: jest.fn(),
    removeAssignment: jest.fn(),
    createCustomTag: jest.fn(),
  }),
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function installFetchMock(responses: Response[]) {
  let call = 0;
  const fetchMock = jest.fn().mockImplementation(() => {
    const r = responses[call++] ?? jsonResponse({});
    return Promise.resolve(r);
  });
  // @ts-expect-error — override global fetch
  global.fetch = fetchMock;
  return fetchMock;
}

describe('AgentModelAssignmentPanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the left rail with all 5 groups after loading', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('agent-list')).toBeInTheDocument());

    for (const group of Object.values(AGENT_GROUPS)) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
    }
  });

  it('shows the primary model badge for configured agents and "未設定" for unconfigured', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    await waitFor(() => {
      const configuredRow = screen.getByTestId('agent-item-contract_assistant');
      expect(within(configuredRow).getByText('Anthropic')).toBeInTheDocument();
    });

    const unconfiguredRow = screen.getByTestId('agent-item-blog_generator');
    expect(within(unconfiguredRow).getByText('未設定')).toBeInTheDocument();
  });

  it('switching agents swaps the right-side strategy form', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    await waitFor(() => screen.getByTestId('agent-strategy-form'));

    // First agent in registry (contract_assistant) is selected by default;
    // its primary select should have the saved value.
    const primarySelect = screen.getByLabelText('primary-model') as HTMLSelectElement;
    expect(primarySelect.value).toBe('anthropic::claude-opus-4-6');

    fireEvent.click(screen.getByTestId('agent-item-blog_generator'));
    const primaryAfter = screen.getByLabelText('primary-model') as HTMLSelectElement;
    expect(primaryAfter.value).toBe('');
  });

  it('saving dirty form sends a PUT with the right payload', async () => {
    const fetchMock = installFetchMock([
      jsonResponse({ assignments: initialAssignments }),
      jsonResponse({
        ok: true,
        assignment: { ...initialAssignments[0], primary_model_id: 'claude-sonnet-4-6' },
      }),
    ]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    await waitFor(() => screen.getByTestId('agent-strategy-form'));

    const primarySelect = screen.getByLabelText('primary-model') as HTMLSelectElement;
    fireEvent.change(primarySelect, { target: { value: 'anthropic::claude-sonnet-4-6' } });

    fireEvent.click(screen.getByRole('button', { name: /儲存/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[1].method).toBe('PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.agent_key).toBe('contract_assistant');
    expect(body.primary_provider).toBe('anthropic');
    expect(body.primary_model_id).toBe('claude-sonnet-4-6');
  });

  it('exports a Markdown report that contains every agent and the current primary model', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    // jsdom's Blob doesn't implement .text(), so we shim the constructor
    // to capture the source string directly before any Blob is created.
    const capturedText: string[] = [];
    const OriginalBlob = global.Blob;
    class CapturingBlob extends OriginalBlob {
      constructor(parts: BlobPart[] = [], options?: BlobPropertyBag) {
        super(parts, options);
        for (const p of parts) {
          if (typeof p === 'string') capturedText.push(p);
        }
      }
    }
    global.Blob = CapturingBlob as unknown as typeof Blob;

    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = jest.fn() as unknown as typeof URL.revokeObjectURL;

    // Spy on anchor click so we don't actually navigate.
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      render(
        <AgentModelAssignmentPanel
          savedKeys={savedKeys}
          validateAllResultsByKeyId={validateAllResultsByKeyId}
          evaluations={evaluations}
          userId={MOCK_USER_ID}
        />,
      );

      await waitFor(() => screen.getByTestId('agent-export-button'));
      fireEvent.click(screen.getByTestId('agent-export-button'));

      expect(capturedText.length).toBeGreaterThan(0);
      const text = capturedText.join('');

      // Title + every registry agent + the configured primary model ID.
      expect(text).toContain('# AI Agent 模型選擇與設定快照');
      expect(text).toContain('### 合約助理 (`contract_assistant`)');
      expect(text).toContain('claude-opus-4-6'); // from initialAssignments
      expect(text).toContain('### 謄本視覺解析');
      // Statistics footer.
      expect(text).toContain('- 已設定：1');
      // download attribute must be a YYYY-MM-DD stamped .md file.
      // We can infer the filename from the <a> tag the panel created.
    } finally {
      global.Blob = OriginalBlob;
      clickSpy.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('shows a "bypass tag filter" button when strict filter returns zero rows', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    // contract_assistant now has suggestedTagKeys=['legal_contract']; the mocked
    // catalog has no rows carrying that tag, so the strict filter returns 0
    // and the bypass button should appear.
    await waitFor(() => screen.getByTestId('agent-item-contract_assistant'));
    fireEvent.click(screen.getByTestId('agent-item-contract_assistant'));

    await waitFor(() => screen.getByTestId('bypass-tag-filter-button'));
    fireEvent.click(screen.getByTestId('bypass-tag-filter-button'));

    // After bypass, the Claude Opus row (status=available) should appear.
    await waitFor(() =>
      screen.getByTestId('rec-row-anthropic-claude-opus-4-6'),
    );
    // The amber "已暫時顯示全部" notice shows up.
    expect(screen.getByText(/已暫時顯示全部/)).toBeInTheDocument();
  });

  it('recommendation panel filters rows by the agent suggestedTagKeys', async () => {
    installFetchMock([jsonResponse({ assignments: initialAssignments })]);

    render(
      <AgentModelAssignmentPanel
        savedKeys={savedKeys}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        evaluations={evaluations}
        userId={MOCK_USER_ID}
      />,
    );

    // Wait for the initial GET to resolve and the list to render.
    await waitFor(() => screen.getByTestId('agent-item-transcript_visual_parse'));

    // Select transcript_visual_parse — suggestedTagKeys: ['transcript_visual_parse']
    fireEvent.click(screen.getByTestId('agent-item-transcript_visual_parse'));

    await waitFor(() => {
      // GPT-4o carries transcript_visual_parse in the mocked catalog, so it should appear.
      expect(screen.getByTestId('rec-row-openai-gpt-4o')).toBeInTheDocument();
    });

    // GPT-5 has no matching tag — it should NOT appear.
    expect(screen.queryByTestId('rec-row-openai-gpt-5')).not.toBeInTheDocument();
    // Claude Opus is tagged only with ad_copy_generation → also filtered out.
    expect(screen.queryByTestId('rec-row-anthropic-claude-opus-4-6')).not.toBeInTheDocument();
  });
});
