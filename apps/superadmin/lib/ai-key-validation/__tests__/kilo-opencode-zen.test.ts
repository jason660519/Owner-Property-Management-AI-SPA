import {
  KILO_GATEWAY_BASE,
  OPENCODE_ZEN_MODELS_URL,
  openCodeZenChatModelId,
  validateKiloGatewayKey,
  validateOpenCodeZenKey,
} from '@/lib/ai-key-validation/kilo-opencode-zen';

describe('openCodeZenChatModelId', () => {
  it('maps OpenRouter Qwen 3.6 Plus to Zen catalog id', () => {
    expect(openCodeZenChatModelId('openrouter/qwen/qwen3.6-plus')).toBe('qwen3.6-plus');
    expect(openCodeZenChatModelId('qwen/qwen3.6-plus')).toBe('qwen3.6-plus');
  });

  it('maps Kimi / MiniMax / GLM OpenRouter ids to Zen slugs', () => {
    expect(openCodeZenChatModelId('openrouter/moonshotai/kimi-k2.5')).toBe('kimi-k2.5');
    expect(openCodeZenChatModelId('openrouter/minimax/minimax-m2.5')).toBe('minimax-m2.5');
    expect(openCodeZenChatModelId('openrouter/minimax/minimax-m2.7')).toBe('minimax-m2.5');
    expect(openCodeZenChatModelId('z-ai/glm-5.1')).toBe('glm-5.1');
  });

  it('passes through Zen-native ids unchanged', () => {
    expect(openCodeZenChatModelId('qwen3.6-plus')).toBe('qwen3.6-plus');
    expect(openCodeZenChatModelId('kimi-k2.5')).toBe('kimi-k2.5');
  });
});

describe('validateOpenCodeZenKey', () => {
  it('should return invalid when API key is empty', async () => {
    const r = await validateOpenCodeZenKey('  ', async () =>
      new Response(null, { status: 500 })
    );
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/金鑰為空/);
  });

  it('should return invalid on 401 from Zen models endpoint', async () => {
    const fetchMock = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const r = await validateOpenCodeZenKey('sk-test', fetchMock);
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/無效|過期/);
    expect(fetchMock).toHaveBeenCalledWith(
      OPENCODE_ZEN_MODELS_URL,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    );
  });

  it('should return valid with availableModels on 200', async () => {
    const fetchMock = jest.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: 'kimi-k2.5', object: 'model' },
            { id: 'glm-5.1', object: 'model' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const r = await validateOpenCodeZenKey('sk-good', fetchMock);
    expect(r.valid).toBe(true);
    expect(r.message).toMatch(/金鑰驗證成功/);
    expect(r.availableModels).toEqual(['kimi-k2.5', 'glm-5.1']);
  });
});

describe('validateKiloGatewayKey', () => {
  it('should return invalid when GET /models returns 401', async () => {
    const fetchMock = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const r = await validateKiloGatewayKey('bad-token', fetchMock);
    expect(r.valid).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Cast via unknown: jest.fn() with no type arg infers `.mock.calls` as
    // never[][], which blocks tuple indexing even with a direct cast.
    const firstCallArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(firstCallArgs[0]).toBe(`${KILO_GATEWAY_BASE}/models`);
  });

  it('should call chat probe after GET /models 200 and return valid on probe 200', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(async () =>
        new Response(
          JSON.stringify({
            data: [{ id: 'anthropic/claude-3-5-haiku' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockImplementationOnce(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'p' } }],
            model: 'anthropic/claude-3-5-haiku',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const r = await validateKiloGatewayKey('jwt-token', fetchMock);
    expect(r.valid).toBe(true);
    expect(r.availableModels).toContain('anthropic/claude-3-5-haiku');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const probeCall = fetchMock.mock.calls[1];
    expect(probeCall[0]).toBe(`${KILO_GATEWAY_BASE}/chat/completions`);
    const body = JSON.parse((probeCall[1] as { body: string }).body) as { model: string };
    expect(body.model).toBe('anthropic/claude-3-5-haiku');
  });

  it('should return invalid when probe returns 401', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ error: { message: 'Invalid' } }), { status: 401 })
      );

    const r = await validateKiloGatewayKey('x', fetchMock);
    expect(r.valid).toBe(false);
  });
});
