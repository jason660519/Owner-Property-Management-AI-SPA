export const PARSER_CONCURRENCY_OPTIONS = [5, 6, 7] as const;
export const DEFAULT_PARSER_CONCURRENCY = 6;

export type ParserConcurrencyOption = (typeof PARSER_CONCURRENCY_OPTIONS)[number];

export function resolveParserConcurrency(
  requested: number | undefined,
  parserCount: number,
): number {
  const requestedValue = PARSER_CONCURRENCY_OPTIONS.includes(requested as ParserConcurrencyOption)
    ? requested
    : DEFAULT_PARSER_CONCURRENCY;

  return Math.min(requestedValue, Math.max(1, parserCount));
}
