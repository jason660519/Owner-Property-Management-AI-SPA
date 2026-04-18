// Query intent classifier and ES query builder for People DB search (Row 144,
// replaces the FastAPI search strategy that was removed with the OCR service).
// Supports exact-first behavior for phone / id_number lookups so large datasets
// don't return fuzzy noise.

export type QueryIntent = 'id_number' | 'phone' | 'full_text';

export interface SearchRequest {
  q: string;
  page: number;
  pageSize: number;
  dataSources: string[];
  quality: 'all' | 'high' | 'medium' | 'low';
}

const ID_NUMBER_REGEX = /^[A-Z][12]\d{8}$/i;
// Strict phone format: plain digits, or leading + followed by digits. Formatted
// numbers (with dashes / spaces) fall through to full_text so the query still
// hits the analyzer instead of the exact phone term.
const PHONE_REGEX = /^\+?\d{7,13}$/;

export function classifyQuery(raw: string): QueryIntent {
  const trimmed = raw.replace(/\s+/g, '');
  if (!trimmed) return 'full_text';
  if (ID_NUMBER_REGEX.test(trimmed)) return 'id_number';
  if (PHONE_REGEX.test(trimmed)) return 'phone';
  return 'full_text';
}

export function normalizePhone(raw: string): string {
  // Strip formatting but preserve leading +; 0 is considered the Taiwanese
  // country-code placeholder and is kept as-is.
  return raw.replace(/[^\d+]/g, '');
}

function qualityRange(level: SearchRequest['quality']): { gte?: number; lte?: number } | null {
  switch (level) {
    case 'high':
      return { gte: 0.8 };
    case 'medium':
      return { gte: 0.5, lte: 0.7999 };
    case 'low':
      return { lte: 0.4999 };
    case 'all':
    default:
      return null;
  }
}

interface EsBoolQuery {
  bool: {
    must: unknown[];
    should: unknown[];
    filter: unknown[];
    minimum_should_match?: number;
  };
}

export function buildSearchBody(req: SearchRequest): Record<string, unknown> {
  const { q, page, pageSize, dataSources, quality } = req;
  const intent = classifyQuery(q);
  const trimmedQuery = q.trim();

  const must: unknown[] = [];
  const should: unknown[] = [];
  const filter: unknown[] = [];

  if (intent === 'id_number' && trimmedQuery) {
    must.push({ term: { id_number: trimmedQuery.toUpperCase() } });
  } else if (intent === 'phone' && trimmedQuery) {
    const normalized = normalizePhone(trimmedQuery);
    // Exact match first, with a fuzzy fallback boosted lower so it still
    // surfaces near-hits (e.g. documents stored with hyphens).
    must.push({
      bool: {
        should: [
          { term: { phone: { value: normalized, boost: 3 } } },
          { wildcard: { phone: { value: `*${normalized}*`, boost: 1 } } },
        ],
        minimum_should_match: 1,
      },
    });
  } else if (trimmedQuery) {
    must.push({
      multi_match: {
        query: trimmedQuery,
        fields: ['name^3', 'address^2', 'organization', 'company', 'title_position'],
        type: 'best_fields',
      },
    });
    // Boost exact-keyword name matches so single-character Chinese names still surface first.
    should.push({ term: { 'name.keyword': { value: trimmedQuery, boost: 5 } } });
  } else {
    must.push({ match_all: {} });
  }

  if (dataSources.length > 0) {
    filter.push({
      bool: {
        should: [
          { terms: { dataset_path: dataSources } },
          { terms: { data_source: dataSources } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const quality_range = qualityRange(quality);
  if (quality_range) {
    filter.push({ range: { quality_score: quality_range } });
  }

  const query: EsBoolQuery = {
    bool: {
      must,
      should,
      filter,
    },
  };

  return {
    from: Math.max(0, (page - 1) * pageSize),
    size: pageSize,
    track_total_hits: true,
    query,
    sort: [
      '_score',
      { quality_score: { order: 'desc', missing: '_last' } },
      { created_at: { order: 'desc', missing: '_last' } },
    ],
  };
}
