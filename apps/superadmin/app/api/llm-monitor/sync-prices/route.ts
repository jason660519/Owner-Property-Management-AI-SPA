import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { listKnownModelIds, getModelPricing } from '@/lib/ai/llm-price-map';

export const runtime = 'nodejs';

const LITELLM_PRICE_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

interface LiteLLMPriceEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  max_tokens?: number;
  litellm_provider?: string;
}

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/llm-monitor/sync-prices',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const res = await fetch(LITELLM_PRICE_URL, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch LiteLLM price map: HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as Record<string, LiteLLMPriceEntry>;
    const totalUpstream = Object.keys(raw).length;

    const knownIds = listKnownModelIds();
    const coverage: Array<{ modelId: string; bundled: boolean; upstream: boolean; delta?: string }> = [];

    for (const modelId of knownIds) {
      const bundled = getModelPricing(modelId);
      const upstreamEntry = raw[modelId] ?? raw[`anthropic/${modelId}`] ?? raw[`openai/${modelId}`] ?? null;
      const upstreamInput = upstreamEntry?.input_cost_per_token ?? null;

      let delta: string | undefined;
      if (bundled && upstreamInput !== null) {
        const diff = Math.abs(bundled.inputCostPerToken - upstreamInput);
        const pct = bundled.inputCostPerToken > 0 ? (diff / bundled.inputCostPerToken) * 100 : 0;
        if (pct > 5) delta = `bundled input: ${bundled.inputCostPerToken}, upstream: ${upstreamInput} (${pct.toFixed(0)}% diff)`;
      }

      coverage.push({ modelId, bundled: true, upstream: upstreamEntry !== null, delta });
    }

    const outdated = coverage.filter((c) => c.delta);
    const missingUpstream = coverage.filter((c) => !c.upstream);

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      totalUpstreamModels: totalUpstream,
      bundledModels: knownIds.length,
      outdatedPrices: outdated,
      missingFromUpstream: missingUpstream.map((m) => m.modelId),
      message: outdated.length === 0
        ? 'Bundled price map is up to date'
        : `${outdated.length} model(s) may have outdated prices — update lib/ai/llm-price-map.ts`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
