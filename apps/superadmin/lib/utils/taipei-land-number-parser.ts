// filepath: apps/superadmin/lib/utils/taipei-land-number-parser.ts
// Parse Taiwan land number strings from transcript data

export interface ParsedLandNumber {
  district: string;
  section: string;
  subsection: string;
  motherNo: string;
  childNo: string;
}

/**
 * Parse a land number string from transcript into components.
 * Handles formats like:
 *   "大安區仁愛段二小段 0367-0000"
 *   "大安區復興段二小段 01696-000建號"
 *   "信義段一小段 第0100地號"
 *   "仁愛段二小段 0367-0000"
 */
export function parseLandNumber(raw: string): ParsedLandNumber | null {
  if (!raw) return null;

  const cleaned = raw.replace(/\s+/g, ' ').trim();

  // Match: [optional district]section[subsection] number
  const m = cleaned.match(
    /^(?:([^\s]+?區))?(.+?段)(?:(一|二|三|四|五|六|七|八|九|十)?小段)?\s+第?(\d+)(?:-(\d+))?(?:地號|建號)?$/
  );
  if (!m) return null;

  return {
    district: m[1] || '',
    section: m[2],               // e.g. "仁愛段"
    subsection: m[3] ? `${m[3]}小段` : '',  // e.g. "二小段" or ""
    motherNo: m[4],              // e.g. "0367"
    childNo: m[5] || '0000',    // e.g. "0000"
  };
}
