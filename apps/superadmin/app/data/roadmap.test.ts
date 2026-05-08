import { ROADMAP_DATA, findRoadmapFeatureById, findRoadmapFeatureByVisIssueKey } from './roadmap';

describe('roadmap stable feature IDs', () => {
  it('keeps every feature ID unique', () => {
    const ids = ROADMAP_DATA.features.map((feature) => feature.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses Feature ID 084 for the transcript intake workbench', () => {
    const feature = findRoadmapFeatureById('084');
    expect(feature?.name).toBe('統一謄本解析工作台');
    expect(feature?.testScriptPath).toBe('apps/superadmin/unit_test/084');
    expect(feature?.devLogDocPath).toBe('/project-process/dev-logs/084-development-log-summary.md');
  });

  it('findRoadmapFeatureByVisIssueKey returns undefined for empty or unknown keys', () => {
    expect(findRoadmapFeatureByVisIssueKey('')).toBeUndefined();
    expect(findRoadmapFeatureByVisIssueKey('not-a-real-vis-key')).toBeUndefined();
  });
});
