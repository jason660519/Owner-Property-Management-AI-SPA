import type { RoadmapFeature } from '@/app/data/roadmap';
import { resolveUnitTestFolder } from './types';

function makeFeature(testScriptPath?: string): RoadmapFeature {
  return {
    name: 'Test feature',
    category: '測試',
    percentage: 10,
    testScriptPath,
  };
}

describe('resolveUnitTestFolder', () => {
  it('uses fallback when testScriptPath is missing', () => {
    const folder = resolveUnitTestFolder(makeFeature(undefined), '131');
    expect(folder).toBe('apps/superadmin/unit_test/131');
  });

  it('uses configured path when it is safe', () => {
    const folder = resolveUnitTestFolder(
      makeFeature('apps/superadmin/unit_test/131'),
      '131',
    );
    expect(folder).toBe('apps/superadmin/unit_test/131');
  });

  it('trims configured path before validating', () => {
    const folder = resolveUnitTestFolder(
      makeFeature('  apps/superadmin/unit_test/131  '),
      '131',
    );
    expect(folder).toBe('apps/superadmin/unit_test/131');
  });

  it('keeps configured path when it has a trailing slash', () => {
    const folder = resolveUnitTestFolder(
      makeFeature('apps/superadmin/unit_test/131/'),
      '131',
    );
    expect(folder).toBe('apps/superadmin/unit_test/131/');
  });

  it('falls back for path traversal and absolute path attempts', () => {
    expect(
      resolveUnitTestFolder(
        makeFeature('apps/superadmin/unit_test/../secrets'),
        '131',
      ),
    ).toBe('apps/superadmin/unit_test/131');

    expect(resolveUnitTestFolder(makeFeature('/etc/passwd'), '131')).toBe(
      'apps/superadmin/unit_test/131',
    );
  });

  it('falls back for non-superadmin and URL-like paths', () => {
    expect(resolveUnitTestFolder(makeFeature('apps/web/e2e/131'), '131')).toBe(
      'apps/superadmin/unit_test/131',
    );

    expect(resolveUnitTestFolder(makeFeature('https://example.com/131'), '131')).toBe(
      'apps/superadmin/unit_test/131',
    );
  });
});
