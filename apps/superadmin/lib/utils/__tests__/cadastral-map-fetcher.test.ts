// filepath: apps/superadmin/lib/utils/__tests__/cadastral-map-fetcher.test.ts
import { buildOperationalLayers, parseAddressNumber } from '../cadastral-map-fetcher';

function layerIds(layers: Record<string, unknown>[]): string[] {
  return layers.map((l) => String(l.id ?? l.layer ?? ''));
}

describe('buildOperationalLayers (GIS export matrix)', () => {
  const cases: { preset: 'cadastral' | 'building' | 'both'; source: 'historygis' | 'epoint'; expectIds: string[] }[] = [
    { preset: 'cadastral', source: 'historygis', expectIds: ['Urban_EMap', 'land', 'Land_Dynamic'] },
    { preset: 'cadastral', source: 'epoint', expectIds: ['Urban_EMap', 'land'] },
    { preset: 'building', source: 'historygis', expectIds: ['Urban_EMap', 'Urban_BldgLicense'] },
    { preset: 'building', source: 'epoint', expectIds: ['Urban_EMap', 'Urban_BldgLicense'] },
    {
      preset: 'both',
      source: 'historygis',
      expectIds: ['Urban_EMap', 'land', 'Land_Dynamic', 'Urban_BldgLicense'],
    },
    { preset: 'both', source: 'epoint', expectIds: ['Urban_EMap', 'land', 'Urban_BldgLicense'] },
  ];

  it.each(cases)(
    '$source + $preset uses expected layer stack',
    ({ preset, source, expectIds }) => {
      const stack = buildOperationalLayers(preset, source);
      expect(layerIds(stack)).toEqual(expectIds);
    },
  );
});

describe('parseAddressNumber', () => {
  it('parses full lane + alley + number', () => {
    expect(parseAddressNumber('170巷17弄12號')).toEqual({
      lane: '170', alley: '17', number: '12', subNumber: '',
    });
  });

  it('parses number only', () => {
    expect(parseAddressNumber('12號')).toEqual({
      lane: '', alley: '', number: '12', subNumber: '',
    });
  });

  it('parses lane + number without alley', () => {
    expect(parseAddressNumber('5巷3號')).toEqual({
      lane: '5', alley: '', number: '3', subNumber: '',
    });
  });

  it('parses number with 之號', () => {
    expect(parseAddressNumber('12號之1')).toEqual({
      lane: '', alley: '', number: '12', subNumber: '1',
    });
  });

  it('parses full address with floor (ignores floor)', () => {
    expect(parseAddressNumber('216巷27弄15號7F')).toEqual({
      lane: '216', alley: '27', number: '15', subNumber: '',
    });
  });

  it('handles empty string', () => {
    expect(parseAddressNumber('')).toEqual({
      lane: '', alley: '', number: '', subNumber: '',
    });
  });

  it('handles null-ish input', () => {
    expect(parseAddressNumber(null as unknown as string)).toEqual({
      lane: '', alley: '', number: '', subNumber: '',
    });
  });
});
