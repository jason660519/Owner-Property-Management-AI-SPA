export const TRANSCRIPT_PARSE_ENSEMBLE_SIZE = 3;
export const TRANSCRIPT_REVIEW_ENSEMBLE_SIZE = 3;
export const TRANSCRIPT_PARSE_CANDIDATE_SIZE = 5;
export const TRANSCRIPT_REVIEW_CANDIDATE_SIZE = 5;

export function limitTranscriptEnsembleModels<T extends { provider: string; model?: string }>(
  models: readonly T[],
  limit: number,
): T[] {
  if (limit <= 0) return [];
  const selected: T[] = [];
  const selectedProviders = new Set<string>();

  for (const model of models) {
    if (selected.length >= limit) break;
    if (selectedProviders.has(model.provider)) continue;
    selectedProviders.add(model.provider);
    selected.push(model);
  }

  for (const model of models) {
    if (selected.length >= limit) break;
    if (selected.includes(model)) continue;
    selected.push(model);
  }

  return selected;
}
