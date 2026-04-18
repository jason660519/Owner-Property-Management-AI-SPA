import {
  classifyQuery,
  normalizePhone,
  buildSearchBody,
} from '../search-strategy';

describe('classifyQuery', () => {
  it('detects id_number (uppercase)', () => {
    expect(classifyQuery('A123456789')).toBe('id_number');
  });
  it('detects id_number (lowercase)', () => {
    expect(classifyQuery('a123456789')).toBe('id_number');
  });
  it('detects phone (plain digits)', () => {
    expect(classifyQuery('0987654321')).toBe('phone');
  });
  it('detects phone (formatted)', () => {
    expect(classifyQuery('02-2345-6789')).toBe('full_text');
    expect(classifyQuery('+886912345678')).toBe('phone');
  });
  it('falls back to full_text for Chinese names', () => {
    expect(classifyQuery('王小明')).toBe('full_text');
  });
  it('handles empty string', () => {
    expect(classifyQuery('')).toBe('full_text');
  });
});

describe('normalizePhone', () => {
  it('strips separators', () => {
    expect(normalizePhone('02-2345 6789')).toBe('0223456789');
  });
  it('keeps leading plus', () => {
    expect(normalizePhone('+886 912 345 678')).toBe('+886912345678');
  });
});

describe('buildSearchBody', () => {
  const base = {
    page: 1,
    pageSize: 20,
    dataSources: [] as string[],
    quality: 'all' as const,
  };

  it('uses term filter for id_number queries', () => {
    const body = buildSearchBody({ ...base, q: 'a123456789' });
    const must = (body.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toEqual(
      expect.arrayContaining([{ term: { id_number: 'A123456789' } }]),
    );
  });

  it('uses term + wildcard fallback for phone queries', () => {
    const body = buildSearchBody({ ...base, q: '+886912345678' });
    const must = (body.query as { bool: { must: unknown[] } }).bool.must;
    expect(JSON.stringify(must)).toContain('"term":{"phone":');
    expect(JSON.stringify(must)).toContain('"wildcard":{"phone":');
  });

  it('uses multi_match for general full-text queries', () => {
    const body = buildSearchBody({ ...base, q: '王小明' });
    const must = (body.query as { bool: { must: unknown[] } }).bool.must;
    expect(JSON.stringify(must)).toContain('"multi_match"');
    expect(JSON.stringify(must)).toContain('"王小明"');
  });

  it('adds dataset/data_source terms filter with OR semantics', () => {
    const body = buildSearchBody({ ...base, q: '', dataSources: ['企業名錄', '台北市里長'] });
    const filter = (body.query as { bool: { filter: unknown[] } }).bool.filter;
    const rendered = JSON.stringify(filter);
    expect(rendered).toContain('dataset_path');
    expect(rendered).toContain('data_source');
    expect(rendered).toContain('企業名錄');
  });

  it('applies quality band range filter', () => {
    const body = buildSearchBody({ ...base, q: '王', quality: 'high' });
    const filter = (body.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(JSON.stringify(filter)).toContain('"gte":0.8');
  });

  it('defaults to match_all on empty query with no filters', () => {
    const body = buildSearchBody({ ...base, q: '' });
    const must = (body.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toEqual(expect.arrayContaining([{ match_all: {} }]));
  });

  it('paginates using from/size', () => {
    const body = buildSearchBody({ ...base, q: '', page: 3, pageSize: 20 });
    expect(body.from).toBe(40);
    expect(body.size).toBe(20);
  });
});
