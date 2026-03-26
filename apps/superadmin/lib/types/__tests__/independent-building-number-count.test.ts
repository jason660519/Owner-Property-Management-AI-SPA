import {
  clampIndependentBuildingNumberCount,
  parseIndependentBuildingNumberCount,
} from '../properties';

describe('clampIndependentBuildingNumberCount', () => {
  it('clamps to 1–10', () => {
    expect(clampIndependentBuildingNumberCount(0)).toBe(1);
    expect(clampIndependentBuildingNumberCount(1)).toBe(1);
    expect(clampIndependentBuildingNumberCount(10)).toBe(10);
    expect(clampIndependentBuildingNumberCount(11)).toBe(10);
    expect(clampIndependentBuildingNumberCount(2.4)).toBe(2);
  });
});

describe('parseIndependentBuildingNumberCount', () => {
  it('defaults to 1 when missing', () => {
    expect(parseIndependentBuildingNumberCount({})).toBe(1);
  });

  it('parses number and string', () => {
    expect(parseIndependentBuildingNumberCount({ independentBuildingNumberCount: 3 })).toBe(3);
    expect(parseIndependentBuildingNumberCount({ independentBuildingNumberCount: '7' })).toBe(7);
  });

  it('clamps out-of-range values', () => {
    expect(parseIndependentBuildingNumberCount({ independentBuildingNumberCount: 99 })).toBe(10);
  });
});
