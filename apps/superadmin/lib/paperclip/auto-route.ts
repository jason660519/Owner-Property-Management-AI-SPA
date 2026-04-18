// Auto-routes a Paperclip issue to a role when the submitter did not pick
// one. Pure function — safe to import from both client and server code.
//
// Design choices (see the discussion with the user for full rationale):
//
//   • Scans ONLY the issue title. Descriptions are full of TDD / worktree
//     boilerplate that causes false positives; titles are `[Row X] feature
//     name` which concentrates the real signal.
//
//   • Rule order is intentional: more specific roles (devops, qa) come
//     BEFORE broader ones (database, uiux, architect) so a title like
//     "測試資料庫遷移" routes to QA, not database.
//
//   • ASCII keywords match with regex word boundaries (case-insensitive) to
//     avoid `'UI'` hitting `guidance` or `'CI'` hitting `decision`.
//     Non-ASCII (CJK) keywords match with plain `includes` because CJK has
//     no whitespace-based word boundaries.
//
//   • Fallback role is `architect` — the user explicitly wants an architect
//     agent to triage anything the keyword rules can't classify, instead of
//     defaulting to fullstack.

import type { PaperclipRoleId } from './types';

/** Outcome of an auto-route lookup. */
export interface AutoRouteResult {
  /** Role the issue should be assigned to. */
  role: PaperclipRoleId;
  /** How the decision was made. */
  source: 'keyword' | 'fallback';
  /** When source === 'keyword', the exact keyword that fired the rule. */
  matchedKeyword?: string;
}

interface RoutingRule {
  readonly role: PaperclipRoleId;
  readonly keywords: readonly string[];
}

/** Keyword dictionary — order matters, see module header. */
const ROUTING_RULES: readonly RoutingRule[] = [
  // DevOps: infra / deploy / monitoring. Highest specificity.
  {
    role: 'devops',
    keywords: [
      'docker',
      'compose',
      'kubernetes',
      'k8s',
      'CI/CD',
      'pipeline',
      'vercel',
      'runbook',
      '部署',
      '健康檢查',
      '監控',
      '站台可靠性',
      'SRE',
      'deploy',
    ],
  },
  // SDET/QA: testing / coverage. Next most specific.
  {
    role: 'sdet',
    keywords: [
      'E2E',
      'Playwright',
      'Vitest',
      'SDET',
      '單元測試',
      '驗收測試',
      'coverage',
      'QA',
      '測試工程師',
      '測試覆蓋',
    ],
  },
  // Database: schema / supabase / ES / RLS.
  {
    role: 'database',
    keywords: [
      '資料庫',
      'migration',
      'schema',
      'RLS',
      'Elastic',
      'ElasticSearch',
      'Elastic Search',
      'PostgreSQL',
      'postgres',
      '索引',
      '觸發器',
    ],
  },
  // UI/UX: layout / design / styling.
  {
    role: 'uiux',
    keywords: [
      'UI',
      'UX',
      '版型',
      '設計稿',
      'RWD',
      '響應式',
      '無障礙',
      'a11y',
      '樣式',
      '設計系統',
      '版面',
    ],
  },
  // Architect: architecture / refactoring / technology selection.
  // Kept last so explicit engineering-domain keywords win first.
  {
    role: 'architect',
    keywords: [
      '架構',
      '重構',
      'ADR',
      '技術選型',
      '系統設計',
      '技術決策',
      'refactor',
      'architecture',
    ],
  },
];

/** Role to use when no keyword rule fires. */
export const FALLBACK_ROLE: PaperclipRoleId = 'architect';

/**
 * Decide which role should own a Paperclip issue based on its title alone.
 * Returns `{ role: 'architect', source: 'fallback' }` when nothing matches.
 */
export function autoRouteRole(title: string): AutoRouteResult {
  const raw = title ?? '';

  for (const rule of ROUTING_RULES) {
    for (const keyword of rule.keywords) {
      if (matchKeyword(keyword, raw)) {
        return {
          role: rule.role,
          source: 'keyword',
          matchedKeyword: keyword,
        };
      }
    }
  }

  return { role: FALLBACK_ROLE, source: 'fallback' };
}

/** Short human-readable tag we embed into the issue description so the
 *  agent knows it was auto-routed. Example outputs:
 *    "🤖 auto: match \"docker\" → devops"
 *    "🤖 auto: fallback → architect"
 */
export function formatAutoRouteTag(result: AutoRouteResult): string {
  if (result.source === 'keyword' && result.matchedKeyword) {
    return `🤖 auto: match "${result.matchedKeyword}" → ${result.role}`;
  }
  return `🤖 auto: fallback → ${result.role}`;
}

function matchKeyword(keyword: string, haystack: string): boolean {
  if (isAscii(keyword)) {
    // ASCII → case-insensitive word-boundary match to avoid substring noise
    // like 'UI' hitting 'guidance' or 'ES' hitting 'services'.
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    return pattern.test(haystack);
  }
  // CJK / other non-ASCII → plain contains. There's no word boundary concept.
  return haystack.includes(keyword);
}

function isAscii(s: string): boolean {
   
  return /^[\x00-\x7F]+$/.test(s);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
