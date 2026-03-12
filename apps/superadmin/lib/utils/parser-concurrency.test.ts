import {
  DEFAULT_PARSER_CONCURRENCY,
  PARSER_CONCURRENCY_OPTIONS,
  resolveParserConcurrency,
} from './parser-concurrency';

describe('resolveParserConcurrency', () => {
  it('defaults to the configured default when no override is provided', () => {
    expect(resolveParserConcurrency(undefined, 10)).toBe(DEFAULT_PARSER_CONCURRENCY);
  });

  it('accepts values in 5–100 range', () => {
    expect(resolveParserConcurrency(5, 10)).toBe(5);
    expect(resolveParserConcurrency(10, 10)).toBe(10);
    expect(resolveParserConcurrency(100, 100)).toBe(100);
    expect(resolveParserConcurrency(8, 10)).toBe(8);
  });

  it('defaults when out of range or invalid', () => {
    expect(resolveParserConcurrency(4, 10)).toBe(DEFAULT_PARSER_CONCURRENCY);
    expect(resolveParserConcurrency(101, 200)).toBe(DEFAULT_PARSER_CONCURRENCY);
    expect(resolveParserConcurrency(5.5, 10)).toBe(DEFAULT_PARSER_CONCURRENCY);
  });

  it('never exceeds the available parser count', () => {
    expect(resolveParserConcurrency(7, 4)).toBe(4);
    expect(resolveParserConcurrency(undefined, 3)).toBe(3);
    expect(resolveParserConcurrency(5, 1)).toBe(1);
  });

  it('exports the selectable UI options 5..100', () => {
    expect(PARSER_CONCURRENCY_OPTIONS).toHaveLength(96);
    expect(PARSER_CONCURRENCY_OPTIONS[0]).toBe(5);
    expect(PARSER_CONCURRENCY_OPTIONS[95]).toBe(100);
  });
});
