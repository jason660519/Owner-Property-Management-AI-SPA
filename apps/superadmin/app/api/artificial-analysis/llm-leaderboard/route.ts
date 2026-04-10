import { NextResponse } from 'next/server';
import {
  ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL,
  parseArtificialAnalysisLlmLeaderboardHtml,
} from '@/lib/artificial-analysis/llm-leaderboard';

export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT_MS = 45_000;

export async function GET() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'OwnerPropertySuperadmin/1.0 (+https://github.com; LLM leaderboard mirror)',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}`, sourceUrl: ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL },
        { status: 502 }
      );
    }
    const html = await res.text();
    const rows = parseArtificialAnalysisLlmLeaderboardHtml(html);
    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not parse leaderboard rows (page structure may have changed)',
          sourceUrl: ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      sourceUrl: ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL,
      rowCount: rows.length,
      rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json(
      { error: message, sourceUrl: ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
