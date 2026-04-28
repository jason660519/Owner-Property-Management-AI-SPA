import { render, screen } from '@testing-library/react';

import { TranscriptIntakeAreaDetailEditor } from '../TranscriptIntakeAreaDetailEditor';
import type { TranscriptIntakeAreaDetailDraft } from '@/lib/transcript-parse/intake-types';

function makeDraft(): TranscriptIntakeAreaDetailDraft {
  return {
    version: 1,
    dispositionKind: 'unit_building_with_land_share_sale',
    parkingTitleRights: [],
    buildingAreas: [],
    landShareAreas: [],
    parkingBuildingAreas: [],
    parkingLandShareAreas: [],
  };
}

describe('TranscriptIntakeAreaDetailEditor', () => {
  it('uses the shared parking empty message in both parking sections', () => {
    render(
      <TranscriptIntakeAreaDetailEditor
        draft={makeDraft()}
        onChange={jest.fn()}
      />
    );

    expect(screen.getAllByText('本標的無車位或尚未上傳車位相關資料')).toHaveLength(2);
  });
});
