// Utility functions for parsing and calculating area values from transcripts.
// Extracted from BuildingTranscriptForm for reuse across components.

/**
 * Parse a numeric area string (e.g. "1,234.56") into a number.
 * Returns 0 for empty or invalid input.
 */
export function parseAreaNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Format a number as an area string with up to 2 decimal places.
 * Returns '' for non-positive or non-finite values.
 */
export function formatAreaNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Parse a share/ownership ratio string into a decimal number.
 * Supports formats:
 *   - Plain fraction: "1/4"
 *   - Taiwan format: "89484分之1339"
 *   - Full ownership: "全部"
 */
export function parseShareRatio(ratio: string): number {
  const value = ratio.trim().replace(/\s+/g, '');
  if (!value) return 0;
  const plainFraction = value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (plainFraction) {
    const numerator = Number(plainFraction[1]);
    const denominator = Number(plainFraction[2]);
    if (denominator > 0) return numerator / denominator;
  }
  const twFractionMatches = [...value.matchAll(/(\d+(?:\.\d+)?)分之(\d+(?:\.\d+)?)/g)];
  if (twFractionMatches.length > 0) {
    const last = twFractionMatches[twFractionMatches.length - 1];
    const denominator = Number(last[1]);
    const numerator = Number(last[2]);
    if (denominator > 0) return numerator / denominator;
  }
  if (value.includes('全部')) return 1;
  return 0;
}

/**
 * Calculate shared common area = area × ratio.
 */
export function getSharedCommonArea(area: string, ratio: string): number {
  return parseAreaNumber(area) * parseShareRatio(ratio);
}

/**
 * Convert square meters to Taiwan ping (坪). 1 坪 = 3.305785 m².
 */
export function sqmToPing(sqm: number): number {
  return sqm / 3.305785;
}

/**
 * Format a ping value with up to 2 decimal places.
 */
export function formatPing(sqm: number): string {
  const ping = sqmToPing(sqm);
  if (!Number.isFinite(ping) || ping <= 0) return '';
  return ping.toFixed(2);
}
