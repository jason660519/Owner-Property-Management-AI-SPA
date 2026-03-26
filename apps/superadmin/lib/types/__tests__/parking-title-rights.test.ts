import { parseParkingTitleRights } from '../properties';

describe('parseParkingTitleRights', () => {
  it('uses stored array when parkingTitleRights key exists', () => {
    expect(
      parseParkingTitleRights({ parkingTitleRights: ['independent', 'shared_facility'] }, ['building_only'])
    ).toEqual(['independent', 'shared_facility']);
  });

  it('dedupes invalid entries', () => {
    expect(
      parseParkingTitleRights(
        { parkingTitleRights: ['independent', 'independent', 'bogus', 'shared_facility'] },
        []
      )
    ).toEqual(['independent', 'shared_facility']);
  });

  it('derives from sale modes when key missing', () => {
    expect(parseParkingTitleRights({}, ['together'])).toEqual(['independent']);
    expect(parseParkingTitleRights({}, ['common_parking_only'])).toEqual(['shared_facility']);
    expect(parseParkingTitleRights({}, ['building_only'])).toEqual([]);
  });

  it('unions legacy rights from multiple sale modes', () => {
    expect(parseParkingTitleRights({}, ['together', 'common_parking_only'])).toEqual([
      'independent',
      'shared_facility',
    ]);
  });
});
