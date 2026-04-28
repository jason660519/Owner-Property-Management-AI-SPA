import { buildConsensusMatrixFromSources } from '../report-standard';

describe('buildConsensusMatrixFromSources', () => {
  it('groups full agreement, partial agreement, single-source values, and full conflicts', () => {
    const matrix = buildConsensusMatrixFromSources([
      {
        participant: 'Parser A',
        structuredJson: {
          owner: '王小明',
          building: { number: '001', areaSqm: '88.5' },
          land: { number: '100' },
        },
      },
      {
        participant: 'Parser B',
        structuredJson: {
          owner: '王小明',
          building: { number: '001', areaSqm: '88.50' },
          land: { number: '101' },
        },
      },
      {
        participant: 'Reviewer',
        structuredJson: {
          owner: '王小明',
          building: { number: '002', areaSqm: '88.5' },
          parking: { number: 'P1' },
          land: { number: '102' },
        },
      },
    ]);

    expect(matrix.allAgree).toEqual([
      expect.objectContaining({
        fieldPath: 'owner',
        participants: ['Parser A', 'Parser B', 'Reviewer'],
      }),
      expect.objectContaining({
        fieldPath: 'building.areaSqm',
        participants: ['Parser A', 'Parser B', 'Reviewer'],
      }),
    ]);
    expect(matrix.majorityAgree).toEqual([
      expect.objectContaining({
        fieldPath: 'building.number',
        participants: ['Parser A', 'Parser B'],
      }),
    ]);
    expect(matrix.singleSource).toEqual([
      expect.objectContaining({
        fieldPath: 'parking.number',
        participants: ['Reviewer'],
      }),
    ]);
    expect(matrix.allDiffer).toEqual([
      expect.objectContaining({
        fieldPath: 'land.number',
        participants: ['Parser A', 'Parser B', 'Reviewer'],
      }),
    ]);
    expect(matrix.humanReviewRequired).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldPath: 'building.number' }),
      expect.objectContaining({ fieldPath: 'parking.number' }),
      expect.objectContaining({ fieldPath: 'land.number' }),
    ]));
  });
});
