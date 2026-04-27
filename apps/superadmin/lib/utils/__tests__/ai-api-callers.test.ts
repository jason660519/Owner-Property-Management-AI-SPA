import { callOpenAI } from '@/lib/utils/ai-api-callers';

describe('callOpenAI', () => {
  const originalFetch = global.fetch;

  function mockOpenAiFetch() {
    const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{}' } }] }),
    }) as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses max_completion_tokens for GPT-5 family models', async () => {
    const fetchMock = mockOpenAiFetch();

    await callOpenAI('test-key', 'gpt-5.5', '', 'text/plain', 'prompt', undefined, { max_tokens: 1234 });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(1234);
    expect(body).not.toHaveProperty('max_tokens');
  });

  it('keeps max_tokens for legacy chat completion models', async () => {
    const fetchMock = mockOpenAiFetch();

    await callOpenAI('test-key', 'gpt-4o', '', 'text/plain', 'prompt', undefined, { max_tokens: 2048 });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.max_tokens).toBe(2048);
    expect(body).not.toHaveProperty('max_completion_tokens');
  });
});
