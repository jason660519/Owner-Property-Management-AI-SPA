import { resolveParsePromptScenario } from '../transcript-parse-scenario-prompts';
import type {
  IndependentTitleSaleMode,
  ParkingTitleRight,
} from '@/lib/types/properties';

describe('resolveParsePromptScenario', () => {
  // Using `as const` on the arrays made them readonly tuples; the callee
  // expects mutable arrays. Use explicit mutable types instead so the fixture
  // matches the parameter shape.
  const base = {
    independentTitleSaleModes: ['building_only'] as IndependentTitleSaleMode[],
    parkingTitleRights: [] as ParkingTitleRight[],
    independentBuildingNumberCount: 1,
  };

  it('returns single_building_number for main building/land with one 建號', () => {
    expect(resolveParsePromptScenario('building', base)).toBe('single_building_number');
    expect(resolveParsePromptScenario('land', base)).toBe('single_building_number');
  });

  it('returns multi_building_number when count >= 2', () => {
    expect(
      resolveParsePromptScenario('building', {
        ...base,
        independentBuildingNumberCount: 3,
      })
    ).toBe('multi_building_number');
  });

  it('returns independent_parking for parking kinds', () => {
    expect(resolveParsePromptScenario('parking_building', base)).toBe('independent_parking');
    expect(resolveParsePromptScenario('parking_land', base)).toBe('independent_parking');
  });

  it('returns shared_facility_parking for main transcripts when only shared parking right', () => {
    expect(
      resolveParsePromptScenario('building', {
        independentTitleSaleModes: [],
        parkingTitleRights: ['shared_facility'],
        independentBuildingNumberCount: 1,
      })
    ).toBe('shared_facility_parking');
  });
});
