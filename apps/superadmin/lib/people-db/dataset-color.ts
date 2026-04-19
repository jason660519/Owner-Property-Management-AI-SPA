// Row 146 Step 4 — stable color assignment for dataset paths.
//
// Search results, merge candidates, and ingest panels need to visually
// distinguish records that come from different datasets. Doing it via a
// fixed palette breaks down once we hit dozens of datasets, so we hash the
// dataset path into an HSL hue. The hash is deterministic (a given path
// always renders the same color across reloads) and bounded to a 360° hue
// wheel, with fixed saturation/lightness pairs tuned for both light and
// dark backgrounds.
//
// Pure function — no imports, no side effects. Safe to call from anywhere.

export interface DatasetColor {
  /** Hue in [0, 360). Stable for the same input. */
  hue: number;
  /** Light-mode background — soft pastel. */
  bg: string;
  /** Light-mode text — deep, saturated. */
  fg: string;
  /** Light-mode border — slightly stronger than bg. */
  border: string;
}

/**
 * Hash an arbitrary string into a stable HSL color via FNV-1a 32-bit.
 * The hue is bounded to [0, 360); empty / nullish input returns a neutral grey.
 */
export function datasetColor(path: string | null | undefined): DatasetColor {
  if (!path) {
    return {
      hue: 0,
      // Neutral chip for "no dataset" / canonical / orphan rows.
      bg: 'hsl(0 0% 92%)',
      fg: 'hsl(0 0% 30%)',
      border: 'hsl(0 0% 80%)',
    };
  }

  // FNV-1a 32-bit hash. Stable, fast, no deps. Distribution is good enough
  // for visual hue assignment (we only need to spread evenly across 360
  // buckets, not cryptographic uniformity).
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i += 1) {
    h ^= path.charCodeAt(i);
    // Keep arithmetic 32-bit to match FNV behaviour and avoid float drift.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hue = h % 360;

  return {
    hue,
    bg: `hsl(${hue} 70% 92%)`,
    fg: `hsl(${hue} 60% 28%)`,
    border: `hsl(${hue} 55% 80%)`,
  };
}

/**
 * Inline style props ready to spread onto a JSX element. Convenience wrapper
 * so callers don't have to reach into the color object every time.
 */
export function datasetColorStyle(
  path: string | null | undefined,
): { backgroundColor: string; color: string; borderColor: string } {
  const c = datasetColor(path);
  return {
    backgroundColor: c.bg,
    color: c.fg,
    borderColor: c.border,
  };
}
