import { autoRouteRole, formatAutoRouteTag, FALLBACK_ROLE } from '../auto-route';

describe('autoRouteRole', () => {
  // ── happy-path keyword matches per role ────────────────────────────────
  it('routes database-related titles to database', () => {
    expect(autoRouteRole('[Row 007] 超級管理員-資料庫Elastic Search管理功能').role).toBe(
      'database',
    );
    expect(autoRouteRole('[Row 010] 新增 RLS policy').role).toBe('database');
    expect(autoRouteRole('[Row 011] add migration for storage_quotas').role).toBe(
      'database',
    );
  });

  it('routes UI/design titles to uiux', () => {
    expect(autoRouteRole('[Row 020] 重做登入頁版型').role).toBe('uiux');
    expect(autoRouteRole('[Row 021] Mobile RWD 調整').role).toBe('uiux');
  });

  it('routes deploy / infra titles to devops', () => {
    expect(autoRouteRole('[Row 030] docker compose 更新').role).toBe('devops');
    expect(autoRouteRole('[Row 031] Vercel 部署 runbook').role).toBe('devops');
  });

  it('routes testing titles to qa', () => {
    expect(autoRouteRole('[Row 040] 新增 Playwright E2E 測試').role).toBe('qa');
    expect(autoRouteRole('[Row 041] 提升 QA coverage 到 80%').role).toBe('qa');
  });

  it('routes architecture titles to architect (via keyword)', () => {
    expect(autoRouteRole('[Row 050] 整體架構重構').role).toBe('architect');
    expect(autoRouteRole('[Row 051] ADR: 選擇 state 管理方案').role).toBe('architect');
  });

  // ── rule ordering: specific before broad ───────────────────────────────
  it('prefers qa over database when both keywords appear', () => {
    // Title mentions both "測試" (qa) and "資料庫" (database).
    // qa rule is checked first, so it wins.
    const result = autoRouteRole('[Row 060] 為資料庫 migration 加 E2E 測試');
    expect(result.role).toBe('qa');
    expect(result.matchedKeyword).toBe('E2E');
  });

  it('prefers devops over database when docker appears alongside schema', () => {
    const result = autoRouteRole('[Row 061] docker compose migration 腳本');
    expect(result.role).toBe('devops');
  });

  // ── ASCII word-boundary: 'UI' MUST NOT hit 'guidance' ──────────────────
  it('does not match ASCII keywords as substrings', () => {
    // 'UI' should NOT fire on 'guidance' or 'built-in'.
    expect(autoRouteRole('[Row 070] 根據 guidance 文件調整 prompt').role).toBe(
      FALLBACK_ROLE,
    );
    // 'ES' is not in the dictionary — make sure 'services' doesn't accidentally
    // trigger anything. (Regression guard for future keyword additions.)
    expect(autoRouteRole('[Row 071] 拆分 services 模組').role).toBe(FALLBACK_ROLE);
  });

  it('matches ASCII keywords case-insensitively', () => {
    expect(autoRouteRole('[Row 072] PLAYWRIGHT runner 升級').role).toBe('qa');
    expect(autoRouteRole('[Row 073] Docker Compose 重構').role).toBe('devops');
  });

  // ── fallback ───────────────────────────────────────────────────────────
  it('falls back to architect when no keyword matches', () => {
    const result = autoRouteRole('[Row 012] 買家的溝通中心');
    expect(result.role).toBe('architect');
    expect(result.source).toBe('fallback');
    expect(result.matchedKeyword).toBeUndefined();
  });

  it('treats empty / whitespace titles as fallback', () => {
    expect(autoRouteRole('').role).toBe(FALLBACK_ROLE);
    expect(autoRouteRole('   ').role).toBe(FALLBACK_ROLE);
  });

  // ── source/matchedKeyword shape ────────────────────────────────────────
  it('reports source and matchedKeyword on keyword hits', () => {
    const result = autoRouteRole('[Row 007] 超級管理員-資料庫Elastic Search管理功能');
    expect(result.source).toBe('keyword');
    expect(result.matchedKeyword).toBeDefined();
  });
});

describe('formatAutoRouteTag', () => {
  it('formats keyword hits with the matched keyword', () => {
    const tag = formatAutoRouteTag({
      role: 'database',
      source: 'keyword',
      matchedKeyword: '資料庫',
    });
    expect(tag).toBe('🤖 auto: match "資料庫" → database');
  });

  it('formats fallback with no keyword', () => {
    const tag = formatAutoRouteTag({ role: 'architect', source: 'fallback' });
    expect(tag).toBe('🤖 auto: fallback → architect');
  });
});
