import {
  parseIndependentLandParcelNumberCount,
  parseSubjectLandParcelScope,
} from '../properties';

describe('parseSubjectLandParcelScope', () => {
  it('defaults to single when missing', () => {
    expect(parseSubjectLandParcelScope({})).toBe('single');
  });

  it('parses valid values', () => {
    expect(parseSubjectLandParcelScope({ subjectLandParcelScope: 'not_applicable' })).toBe(
      'not_applicable',
    );
    expect(parseSubjectLandParcelScope({ subjectLandParcelScope: 'multi' })).toBe('multi');
  });
});

describe('parseIndependentLandParcelNumberCount', () => {
  it('defaults to 1 when missing', () => {
    expect(parseIndependentLandParcelNumberCount({})).toBe(1);
  });

  it('clamps like building count', () => {
    expect(parseIndependentLandParcelNumberCount({ independentLandParcelNumberCount: 5 })).toBe(5);
    expect(parseIndependentLandParcelNumberCount({ independentLandParcelNumberCount: 99 })).toBe(10);
  });
});
