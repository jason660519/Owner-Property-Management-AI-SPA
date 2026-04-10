import { parseArtificialAnalysisLlmLeaderboardHtml } from '../llm-leaderboard';

describe('parseArtificialAnalysisLlmLeaderboardHtml', () => {
  it('parses one SSR data row, converting numeric cells to numbers', () => {
    // Raw HTML contains display strings like "128k" and "$1.00"; the parser
    // normalizes them to numbers so TanStack can sort natively (units live
    // on the column headers in LlmLeaderboardPanel).
    const html = `<tr class="border-b border-[hsl(var(--ui-border))] data-[state=selected]:bg-[hsl(var(--ui-muted))] group hover:bg-slate-50 transition-colors"><td class="p-2"><div class="font-semibold">Demo Model X</div></td><td class="p-2"><div class="text-center">128k</div></td><td class="p-2"><div class="flex gap-2"><span class="leading-[16px]">Acme</span></div></td><td class="p-2"><div class="text-center">42</div></td><td class="p-2"><div class="text-center">$1.00</div></td><td class="p-2"><div class="text-center">99</div></td><td class="p-2"><div class="text-center">1.5</div></td><td class="p-2"><div class="text-center">3.2</div></td><td class="p-2"><div class="flex items-center"><a href="/models/demo-x">Model</a><a href="/models/demo-x/providers">Providers</a></div></td></tr>`;
    const rows = parseArtificialAnalysisLlmLeaderboardHtml(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].model).toBe('Demo Model X');
    expect(rows[0].creator).toBe('Acme');

    // Numeric fields: strings converted to numbers
    expect(rows[0].contextWindowTokens).toBe(128_000); // "128k" → 128000
    expect(rows[0].intelligenceIndex).toBe(42);
    expect(rows[0].blendedUsdPer1m).toBe(1); // "$1.00" → 1
    expect(rows[0].medianTokensPerSecond).toBe(99);
    expect(rows[0].latencyFirstChunkSeconds).toBe(1.5);
    expect(rows[0].totalResponseSeconds).toBe(3.2);

    expect(rows[0].modelPath).toBe('/models/demo-x');
    expect(rows[0].providersPath).toBe('/models/demo-x/providers');
  });

  it('returns null for missing / unparseable numeric cells', () => {
    const html = `<tr class="border-b border-[hsl(var(--ui-border))] data-[state=selected]:bg-[hsl(var(--ui-muted))] group hover:bg-slate-50 transition-colors"><td class="p-2"><div>Test Model</div></td><td class="p-2"><div>—</div></td><td class="p-2"><div>Acme</div></td><td class="p-2"><div>N/A</div></td><td class="p-2"><div></div></td><td class="p-2"><div>—</div></td><td class="p-2"><div>-</div></td><td class="p-2"><div>n/a</div></td><td class="p-2"><div><a href="/models/test">Model</a></div></td></tr>`;
    const rows = parseArtificialAnalysisLlmLeaderboardHtml(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].contextWindowTokens).toBeNull();
    expect(rows[0].intelligenceIndex).toBeNull();
    expect(rows[0].blendedUsdPer1m).toBeNull();
    expect(rows[0].medianTokensPerSecond).toBeNull();
    expect(rows[0].latencyFirstChunkSeconds).toBeNull();
    expect(rows[0].totalResponseSeconds).toBeNull();
  });
});
