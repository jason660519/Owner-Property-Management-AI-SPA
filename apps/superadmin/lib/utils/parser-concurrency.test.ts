import {
  DEFAULT_PARSER_CONCURRENCY,
  PARSER_CONCURRENCY_OPTIONS,
  resolveParserConcurrency,
} from './parser-concurrency';

describe('resolveParserConcurrency', () => {
  it('defaults to the configured default when no override is provided', () => {
    expect(resolveParserConcurrency(undefined, 10)).toBe(DEFAULT_PARSER_CONCURRENCY);
  });

  it('accepts only supported override values', () => {
    expect(resolveParserConcurrency(5, 10)).toBe(5);
    expect(resolveParserConcurrency(6, 10)).toBe(6);
    expect(resolveParserConcurrency(7, 10)).toBe(7);
    expect(resolveParserConcurrency(8, 10)).toBe(DEFAULT_PARSER_CONCURRENCY);
  });

  it('never exceeds the available parser count', () => {
    expect(resolveParserConcurrency(7, 4)).toBe(4);
    expect(resolveParserConcurrency(undefined, 3)).toBe(3);
    expect(resolveParserConcurrency(5, 1)).toBe(1);
  });

  it('exports the selectable UI options', () => {
    expect(PARSER_CONCURRENCY_OPTIONS).toEqual([5, 6, 7]);
  });
});
