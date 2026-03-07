const MIN_PARSER_CONCURRENCY = 5;
const MAX_PARSER_CONCURRENCY = 100;

/** Options 5..100 for the "simultaneous parse model count" dropdown */
export const PARSER_CONCURRENCY_OPTIONS = Array.from(
  { length: MAX_PARSER_CONCURRENCY - MIN_PARSER_CONCURRENCY + 1 },
  (_, i) => MIN_PARSER_CONCURRENCY + i,
) as number[];

export const DEFAULT_PARSER_CONCURRENCY = 10;

export function resolveParserConcurrency(
  requested: number | undefined,
  parserCount: number,
): number {
  const clamped =
    typeof requested === 'number' &&
    Number.isInteger(requested) &&
    requested >= MIN_PARSER_CONCURRENCY &&
    requested <= MAX_PARSER_CONCURRENCY
      ? requested
      : DEFAULT_PARSER_CONCURRENCY;

  return Math.min(clamped, Math.max(1, parserCount));
}
