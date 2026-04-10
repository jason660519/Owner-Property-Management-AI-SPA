/**
 * Parse Artificial Analysis LLM leaderboard HTML (SSR table rows).
 * Source: https://artificialanalysis.ai/leaderboards/models
 *
 * Numeric fields are stored as `number | null` (not the original display
 * strings) so the table can sort them natively without custom sortingFns.
 * Units live on column headers (e.g. "Price (USD/1M)"), cells render plain
 * numbers via a cell formatter. This follows the create-tanstack-table skill
 * recommendation: "numbers in cell, units in header".
 */

import { parseNumericCell } from '@/lib/utils/table-sorting';

export const ARTIFICIAL_ANALYSIS_LLM_LEADERBOARD_URL =
  'https://artificialanalysis.ai/leaderboards/models';

export const ARTIFICIAL_ANALYSIS_SITE_ORIGIN = 'https://artificialanalysis.ai';

export type ArtificialAnalysisLlmLeaderboardRow = {
  model: string;
  /** Token count normalized to an integer ("128k" → 128_000, "1M" → 1_000_000). */
  contextWindowTokens: number | null;
  creator: string;
  /** AA intelligence index (0–100 scale). */
  intelligenceIndex: number | null;
  /** Blended price in USD per 1 million tokens. */
  blendedUsdPer1m: number | null;
  /** Median output throughput in tokens per second. */
  medianTokensPerSecond: number | null;
  /** Time to first chunk, in seconds. */
  latencyFirstChunkSeconds: number | null;
  /** Full response time (end-to-end) in seconds. */
  totalResponseSeconds: number | null;
  modelPath: string | null;
  providersPath: string | null;
};

/** Parse a display cell into a finite number, or null for missing values. */
function toNumberOrNull(raw: string): number | null {
  const n = parseNumericCell(raw);
  return Number.isFinite(n) ? n : null;
}

/** Matches data rows in the leaderboard table body (SSR). */
const TR_PATTERN =
  /<tr class="border-b border-\[hsl\(var\(--ui-border\)\)\] data-\[state=selected\]:bg-\[hsl\(var\(--ui-muted\)\)\] group hover:bg-slate-50 transition-colors"[^>]*>([\s\S]*?)<\/tr>/g;

const TD_PATTERN = /<td[^>]*>([\s\S]*?)<\/td>/g;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTdContents(trInner: string): string[] {
  const tds: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TD_PATTERN.source, TD_PATTERN.flags);
  while ((m = re.exec(trInner)) !== null) {
    tds.push(m[1]);
  }
  return tds;
}

function extractModelLinks(tdHtml: string): { modelPath: string | null; providersPath: string | null } {
  const hrefs = [...tdHtml.matchAll(/href="(\/models\/[^"]+)"/g)].map((x) => x[1]);
  const providersPath = hrefs.find((h) => h.endsWith('/providers')) ?? null;
  const modelPath = hrefs.find((h) => !h.endsWith('/providers')) ?? null;
  return { modelPath, providersPath };
}

export function parseArtificialAnalysisLlmLeaderboardHtml(html: string): ArtificialAnalysisLlmLeaderboardRow[] {
  const rows: ArtificialAnalysisLlmLeaderboardRow[] = [];
  let m: RegExpExecArray | null;
  const trRe = new RegExp(TR_PATTERN.source, TR_PATTERN.flags);
  while ((m = trRe.exec(html)) !== null) {
    const inner = m[1];
    const tds = extractTdContents(inner);
    if (tds.length < 9) continue;
    const links = extractModelLinks(tds[8]);
    rows.push({
      model: stripHtml(tds[0]),
      contextWindowTokens: toNumberOrNull(stripHtml(tds[1])),
      creator: stripHtml(tds[2]),
      intelligenceIndex: toNumberOrNull(stripHtml(tds[3])),
      blendedUsdPer1m: toNumberOrNull(stripHtml(tds[4])),
      medianTokensPerSecond: toNumberOrNull(stripHtml(tds[5])),
      latencyFirstChunkSeconds: toNumberOrNull(stripHtml(tds[6])),
      totalResponseSeconds: toNumberOrNull(stripHtml(tds[7])),
      modelPath: links.modelPath,
      providersPath: links.providersPath,
    });
  }
  return rows;
}
