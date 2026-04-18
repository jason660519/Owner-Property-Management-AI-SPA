/**
 * Kilo AI Gateway + OpenCode Zen API key validation (HTTP).
 * @see https://kilo.ai/docs/gateway/api-reference — base https://api.kilo.ai/api/gateway
 * @see https://opencode.ai/docs/zen/ — models list https://opencode.ai/zen/v1/models
 */

export const KILO_GATEWAY_BASE = 'https://api.kilo.ai/api/gateway';
export const OPENCODE_ZEN_BASE = 'https://opencode.ai/zen/v1';
export const OPENCODE_ZEN_MODELS_URL = `${OPENCODE_ZEN_BASE}/models`;
export const OPENCODE_ZEN_CHAT_COMPLETIONS_URL = `${OPENCODE_ZEN_BASE}/chat/completions`;

/** Default model for a minimal chat probe when /models does not reject bad keys. */
const KILO_PROBE_MODEL = 'openai/gpt-4o-mini';

export type GatewayKeyValidationResult = {
  valid: boolean;
  provider: 'kilo' | 'opencode';
  message: string;
  modelInfo?: string;
  availableModels?: string[];
};

function parseOpenAiCompatibleModelIds(data: unknown): string[] {
  const raw = data as { data?: { id?: string }[] };
  if (!Array.isArray(raw?.data)) return [];
  return raw.data.map((m) => m?.id ?? '').filter(Boolean);
}

function errorMessageFromJson(data: unknown): string | undefined {
  const err = data as { error?: { message?: string } };
  return typeof err?.error?.message === 'string' ? err.error.message : undefined;
}

/**
 * Kilo: prefer GET /models with Bearer (many gateways return 401 for bad keys).
 * If GET succeeds without proving the key, run a minimal POST /chat/completions probe.
 */
export async function validateKiloGatewayKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<GatewayKeyValidationResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, provider: 'kilo', message: '金鑰為空，請重新貼上 KILO_API_KEY' };
  }

  const modelsUrl = `${KILO_GATEWAY_BASE}/models`;
  try {
    const listRes = await fetchImpl(modelsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmed}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(25_000),
    });

    const listJson = await listRes.json().catch(() => ({}));

    if (listRes.status === 401) {
      return { valid: false, provider: 'kilo', message: '金鑰無效或已過期' };
    }
    if (listRes.status === 402) {
      return {
        valid: false,
        provider: 'kilo',
        message: errorMessageFromJson(listJson) ?? '帳戶餘額不足（402）',
      };
    }

    let models = parseOpenAiCompatibleModelIds(listJson);
    const probeModel = models[0] ?? KILO_PROBE_MODEL;

    // Public /models may not require auth — confirm key with a 1-token chat probe.
    const probeRes = await fetchImpl(`${KILO_GATEWAY_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${trimmed}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: probeModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const probeJson = await probeRes.json().catch(() => ({}));

    if (probeRes.status === 401) {
      return { valid: false, provider: 'kilo', message: '金鑰無效或已過期' };
    }
    if (probeRes.status === 402) {
      return {
        valid: false,
        provider: 'kilo',
        message: errorMessageFromJson(probeJson) ?? '帳戶餘額不足（402）',
      };
    }
    if (!probeRes.ok) {
      const msg = errorMessageFromJson(probeJson) ?? `HTTP ${probeRes.status}`;
      return { valid: false, provider: 'kilo', message: msg };
    }

    if (models.length === 0) {
      models = parseOpenAiCompatibleModelIds(listJson);
    }

    const recommended = models[0];
    return {
      valid: true,
      provider: 'kilo',
      message: '金鑰驗證成功',
      modelInfo: recommended ? `推薦: ${recommended}` : `可用模型 ${models.length} 個`,
      availableModels: models,
    };
  } catch (e) {
    return {
      valid: false,
      provider: 'kilo',
      message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}

/**
 * OpenCode Zen: GET https://opencode.ai/zen/v1/models with Bearer (same pattern as OpenRouter).
 */
export async function validateOpenCodeZenKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<GatewayKeyValidationResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, provider: 'opencode', message: '金鑰為空，請重新貼上 OPENCODE_API_KEY' };
  }

  try {
    const res = await fetchImpl(OPENCODE_ZEN_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmed}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(25_000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      return { valid: false, provider: 'opencode', message: '金鑰無效或已過期' };
    }
    if (res.status === 402) {
      return {
        valid: false,
        provider: 'opencode',
        message: errorMessageFromJson(data) ?? '帳戶餘額不足（402）',
      };
    }
    if (!res.ok) {
      const msg = errorMessageFromJson(data) ?? `HTTP ${res.status}`;
      return { valid: false, provider: 'opencode', message: msg };
    }

    const models = parseOpenAiCompatibleModelIds(data);
    const recommended = models[0];
    return {
      valid: true,
      provider: 'opencode',
      message: '金鑰驗證成功',
      modelInfo: recommended ? `推薦: ${recommended}` : `可用模型 ${models.length} 個`,
      availableModels: models,
    };
  } catch (e) {
    return {
      valid: false,
      provider: 'opencode',
      message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}
