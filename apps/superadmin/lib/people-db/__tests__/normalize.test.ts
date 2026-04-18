// Row 145 Sprint 4a Phase 1 — normalize.ts unit tests.
//
// Pure functions that turn raw parser output into canonicalised fields
// the ER worker can compare on. Reuses normalizeAddress (Row 144) and
// normalizePhone (Row 132) so only name / id_no / birth_year are new.

import {
  normalizeName,
  normalizeIdNo,
  normalizeBirthYear,
  normalizeRecord,
  type ColumnMap,
} from '../normalize';

describe('normalizeName', () => {
  it('collapses full-width and half-width whitespace', () => {
    expect(normalizeName('王 小明')).toBe('王小明');
    expect(normalizeName('王　小明')).toBe('王小明');
    expect(normalizeName('  闕貴卿  ')).toBe('闕貴卿');
  });

  it('converts full-width Latin to half-width', () => {
    expect(normalizeName('ＡＢＣ')).toBe('ABC');
  });

  it('returns null for empty / whitespace-only / null input', () => {
    expect(normalizeName('')).toBeNull();
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName(null)).toBeNull();
    expect(normalizeName(undefined)).toBeNull();
  });
});

describe('normalizeIdNo', () => {
  it('uppercases and strips whitespace on a well-formed Taiwan id', () => {
    expect(normalizeIdNo('a123456789')).toBe('A123456789');
    expect(normalizeIdNo(' A123456789 ')).toBe('A123456789');
  });

  it('returns null for structurally invalid ids (but does NOT run checksum — avoids false rejects)', () => {
    expect(normalizeIdNo('12345')).toBeNull(); // too short
    expect(normalizeIdNo('AA1234567')).toBeNull(); // two letters
    expect(normalizeIdNo('A12345678X')).toBeNull(); // non-digit in body
  });

  it('returns null for empty / null input', () => {
    expect(normalizeIdNo('')).toBeNull();
    expect(normalizeIdNo(null)).toBeNull();
  });
});

describe('normalizeBirthYear', () => {
  it('converts ROC year integer to CE', () => {
    expect(normalizeBirthYear('102')).toBe(2013);
    expect(normalizeBirthYear('100')).toBe(2011);
  });

  it('passes through CE 4-digit years', () => {
    expect(normalizeBirthYear('2013')).toBe(2013);
    expect(normalizeBirthYear('1985')).toBe(1985);
  });

  it('extracts ROC year from a full ROC date string', () => {
    expect(normalizeBirthYear('民國100年02月11日')).toBe(2011);
    expect(normalizeBirthYear('102/05/20')).toBe(2013); // leading 3-digit → ROC
  });

  it('returns null for unparseable / out-of-range input', () => {
    expect(normalizeBirthYear('')).toBeNull();
    expect(normalizeBirthYear('0')).toBeNull();
    expect(normalizeBirthYear('abc')).toBeNull();
    expect(normalizeBirthYear(null)).toBeNull();
  });
});

describe('normalizeRecord', () => {
  const map: ColumnMap = {
    name: ['姓名', 'name'],
    id_no: ['身分證', 'id_no'],
    phone: ['電話', '行動電話', 'phone'],
    address: ['地址', 'address'],
    birth: ['出生', '生日', 'birth'],
  };

  it('extracts and normalizes a full record', () => {
    const raw = {
      姓名: ' 闕貴卿 ',
      身分證: 'a123456789',
      電話: '02-2785-1310',
      行動電話: '0933-718-819',
      地址: '臺北市南港區南港路一段212號2樓',
      出生: '民國55年03月15日',
    };
    const n = normalizeRecord(raw, map);
    expect(n.name).toBe('闕貴卿');
    expect(n.id_no).toBe('A123456789');
    expect(n.phones).toEqual(['0227851310', '0933718819']);
    expect(n.address?.county).toBe('臺北市');
    expect(n.address?.district).toBe('南港區');
    expect(n.birth_year).toBe(1966);
  });

  it('deduplicates phones and drops blanks', () => {
    const raw = { phone: '0912345678', 行動電話: '0912345678', 電話: '' };
    const n = normalizeRecord(raw, map);
    expect(n.phones).toEqual(['0912345678']);
  });

  it('handles missing raw fields gracefully', () => {
    const n = normalizeRecord({ 姓名: '李大' }, map);
    expect(n.name).toBe('李大');
    expect(n.id_no).toBeNull();
    expect(n.phones).toEqual([]);
    expect(n.address).toBeNull();
    expect(n.birth_year).toBeNull();
  });

  it('ignores columns not listed in the ColumnMap', () => {
    const raw = { 備註: '不相關', 姓名: '王' };
    const n = normalizeRecord(raw, map);
    expect(n.name).toBe('王');
    // 備註 should NOT show up in any normalized field
  });

  it('returns all-null for an empty raw record', () => {
    const n = normalizeRecord({}, map);
    expect(n.name).toBeNull();
    expect(n.id_no).toBeNull();
    expect(n.phones).toEqual([]);
    expect(n.address).toBeNull();
    expect(n.birth_year).toBeNull();
  });
});
