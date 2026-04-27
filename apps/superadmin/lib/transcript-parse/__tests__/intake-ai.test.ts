const mockCaller = jest.fn(async (...args: unknown[]) => {
  const model = String(args[1]);
  if (model === 'gpt-5.5') {
    return { ok: true, text: '{' };
  }
  const confidence = model === 'gpt-5.3-chat-latest' ? 0.77 : model.includes('claude') ? 0.82 : 0.64;
  return {
    ok: true,
    text: JSON.stringify({
      approved: true,
      confidence,
      issues: [],
      parkingTitleRights: [],
      dispositionKind: 'unit_building_with_land_share_sale',
      userConfirmationRequired: [],
      fieldDecisions: [],
      doubleCheckSummary: [],
    }),
  };
});

const mockResolveAgentModel = jest.fn(async () => ({
  chain: [
    { provider: 'openai', model_id: 'gpt-5.5', config: {} },
    { provider: 'anthropic', model_id: 'claude-opus-4-5-20251101', config: {} },
    { provider: 'grok', model_id: 'grok-4.20-reasoning', config: {} },
    { provider: 'openai', model_id: 'gpt-5.3-chat-latest', config: {} },
  ],
}));

jest.mock('@/lib/ai/audit', () => ({
  startPromptAudit: () => ({ complete: jest.fn() }),
}));

jest.mock('@/lib/ai/resolve-agent-model', () => ({
  resolveAgentModel: () => mockResolveAgentModel(),
}));

jest.mock('@/lib/ai/prompt-safety', () => ({
  PromptNotFoundError: class PromptNotFoundError extends Error {},
  resolveSystemPrompt: async () => ({
    content: 'review prompt',
    source: 'saved_prompts_module_key',
    savedPromptId: 'prompt-1',
    aiSystemPromptId: null,
  }),
}));

jest.mock('@/lib/crypto', () => ({
  decryptApiKey: async () => 'api-key',
}));

jest.mock('@/lib/utils/ai-api-callers', () => ({
  CALLERS: {
    openai: (
      apiKey: unknown,
      model: unknown,
      fileBase64: unknown,
      mimeType: unknown,
      prompt: unknown,
      signal: unknown,
      config: unknown,
    ) => mockCaller(apiKey, model, fileBase64, mimeType, prompt, signal, config),
    anthropic: (
      apiKey: unknown,
      model: unknown,
      fileBase64: unknown,
      mimeType: unknown,
      prompt: unknown,
      signal: unknown,
      config: unknown,
    ) => mockCaller(apiKey, model, fileBase64, mimeType, prompt, signal, config),
    grok: (
      apiKey: unknown,
      model: unknown,
      fileBase64: unknown,
      mimeType: unknown,
      prompt: unknown,
      signal: unknown,
      config: unknown,
    ) => mockCaller(apiKey, model, fileBase64, mimeType, prompt, signal, config),
  },
  extractJsonFromOutput: (text: string) => JSON.parse(text),
  mimeFromPath: () => 'image/png',
}));

import { runTranscriptIntakeReviewAi } from '../intake-ai';

function makeAdminClient() {
  const apiKeyQuery = {
    eq: () => apiKeyQuery,
    single: async () => ({
      data: { api_key_encrypted: 'encrypted', iv: 'iv' },
      error: null,
    }),
  };
  return {
    from: (table: string) => ({
      select: () => {
        if (table === 'property_documents') {
          return {
            in: () => ({
              eq: async () => ({
                data: [{
                  id: 'doc-1',
                  file_path: 'property/doc.png',
                  document_type: 'registry_transcript_unclassified',
                  document_name: '權狀影本',
                  mime_type: 'image/png',
                }],
                error: null,
              }),
            }),
          };
        }
        return apiKeyQuery;
      },
    }),
    storage: {
      from: () => ({
        download: async () => ({
          data: {
            arrayBuffer: async () => Buffer.from('fake image'),
          },
          error: null,
        }),
      }),
    },
  };
}

describe('runTranscriptIntakeReviewAi', () => {
  beforeEach(() => {
    mockCaller.mockClear();
    mockResolveAgentModel.mockClear();
  });

  it('fills a failed reviewer slot with the next fallback model', async () => {
    const events: Array<Record<string, unknown>> = [];
    const review = await runTranscriptIntakeReviewAi({
      adminClient: makeAdminClient() as never,
      runId: 'run-1',
      userId: 'admin-1',
      documentIds: ['doc-1'],
      routeDecision: { aggregateRoute: 'vlm_visual' },
      parsedResult: {
        parserReports: [],
        documents: [],
      },
      onModelEvent: (event) => events.push(event),
    });

    const calledModels = mockCaller.mock.calls.map((call) => String(call[1]));
    expect(calledModels).toEqual([
      'gpt-5.5',
      'claude-opus-4-5-20251101',
      'grok-4.20-reasoning',
      'gpt-5.3-chat-latest',
    ]);
    expect(review.reviewerReports).toHaveLength(3);
    expect(review.reviewerReports?.map((report) => report.model)).toEqual([
      'claude-opus-4-5-20251101',
      'grok-4.20-reasoning',
      'gpt-5.3-chat-latest',
    ]);
    expect(review.reviewerErrors).toEqual([
      expect.stringContaining('openai/gpt-5.5'),
    ]);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'model_result', provider: 'openai', model: 'gpt-5.5', success: false }),
      expect.objectContaining({ type: 'model_start', provider: 'openai', model: 'gpt-5.3-chat-latest' }),
      expect.objectContaining({ type: 'model_result', provider: 'openai', model: 'gpt-5.3-chat-latest', success: true }),
    ]));
  });
});
