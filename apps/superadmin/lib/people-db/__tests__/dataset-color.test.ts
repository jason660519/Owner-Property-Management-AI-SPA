// Row 146 Step 4 — verify the dataset-color HSL hash is stable, bounded,
// and assigns visually distinct colors across the dataset population we'd
// realistically see in the wild.

import { datasetColor, datasetColorStyle } from '../dataset-color';

describe('datasetColor — Row 146 stable HSL hash', () => {
  it('returns a deterministic hue for the same input', () => {
    const a = datasetColor('企業名錄');
    const b = datasetColor('企業名錄');
    expect(a.hue).toBe(b.hue);
    expect(a.bg).toBe(b.bg);
    expect(a.fg).toBe(b.fg);
    expect(a.border).toBe(b.border);
  });

  it('keeps the hue inside the [0, 360) wheel', () => {
    const samples = [
      '企業名錄',
      '北市稅籍',
      '台北市里長',
      '2026Q1 北市新檔',
      '法拍/2024',
      'A'.repeat(500),
    ];
    for (const s of samples) {
      const { hue } = datasetColor(s);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('produces distinct hues for different inputs (no all-zero collisions)', () => {
    const inputs = Array.from({ length: 50 }, (_, i) => `dataset-${i}`);
    const hues = new Set(inputs.map((i) => datasetColor(i).hue));
    // Allow some collisions (50 buckets into 360 is fine), but require at
    // least 30 distinct values — anything less means the hash is broken.
    expect(hues.size).toBeGreaterThanOrEqual(30);
  });

  it('returns a neutral grey for empty / null / undefined input', () => {
    const empty = datasetColor('');
    const nullish = datasetColor(null);
    const undef = datasetColor(undefined);
    // Hue collapses to 0 and saturation collapses to 0% — uniform grey.
    expect(empty.bg).toMatch(/hsl\(0 0%/);
    expect(nullish.bg).toMatch(/hsl\(0 0%/);
    expect(undef.bg).toMatch(/hsl\(0 0%/);
  });

  it('emits well-formed HSL strings ready for inline styles', () => {
    const c = datasetColor('企業名錄');
    expect(c.bg).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    expect(c.fg).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    expect(c.border).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
  });
});

describe('datasetColorStyle — convenience CSS-prop wrapper', () => {
  it('maps the datasetColor fields onto react-style CSS keys', () => {
    const style = datasetColorStyle('企業名錄');
    expect(style).toEqual({
      backgroundColor: expect.stringMatching(/^hsl\(/),
      color: expect.stringMatching(/^hsl\(/),
      borderColor: expect.stringMatching(/^hsl\(/),
    });
  });

  it('returns the same colors as datasetColor for a given input', () => {
    const c = datasetColor('北市稅籍');
    const s = datasetColorStyle('北市稅籍');
    expect(s.backgroundColor).toBe(c.bg);
    expect(s.color).toBe(c.fg);
    expect(s.borderColor).toBe(c.border);
  });
});
