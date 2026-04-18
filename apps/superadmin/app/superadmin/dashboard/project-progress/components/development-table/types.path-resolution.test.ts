import type { RoadmapFeature } from '@/app/data/roadmap';
import {
  buildFallbackDevLogDocPath,
  resolveConfiguredDevLogDocPath,
  resolveDevLogDocPath,
  resolveUnitTestFolder,
} from './types';

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

describe('resolveDevLogDocPath', () => {
  it('uses configured markdown path when it is safe', () => {
    const feature: RoadmapFeature = {
      name: 'Test feature',
      category: '測試',
      percentage: 10,
      devLogDocPath: '/project-process/dev-logs/test-feature-dev-log-2026-04-17.md',
    };

    expect(resolveConfiguredDevLogDocPath(feature)).toBe(
      'project-process/dev-logs/test-feature-dev-log-2026-04-17.md',
    );
    expect(resolveDevLogDocPath(feature, '131')).toBe(
      'project-process/dev-logs/test-feature-dev-log-2026-04-17.md',
    );
  });

  it('accepts docs markdown paths for existing roadmap rows', () => {
    const feature: RoadmapFeature = {
      name: 'Test feature',
      category: '測試',
      percentage: 10,
      devLogDocPath: '/docs/operational-guides/transcript-parsing-guide.md',
    };

    expect(resolveConfiguredDevLogDocPath(feature)).toBe(
      'docs/operational-guides/transcript-parsing-guide.md',
    );
  });

  it('falls back when devLogDocPath is missing or invalid', () => {
    expect(
      resolveDevLogDocPath(
        {
          name: 'Missing path',
          category: '測試',
          percentage: 0,
        },
        '131',
      ),
    ).toBe(buildFallbackDevLogDocPath('131'));

    expect(
      resolveDevLogDocPath(
        {
          name: 'Invalid path',
          category: '測試',
          percentage: 0,
          devLogDocPath: '/project-process/dev-logs/not-markdown.txt',
        },
        '132',
      ),
    ).toBe(buildFallbackDevLogDocPath('132'));

    expect(
      resolveDevLogDocPath(
        {
          name: 'Traversal attempt',
          category: '測試',
          percentage: 0,
          devLogDocPath: '/project-process/../secret.md',
        },
        '133',
      ),
    ).toBe(buildFallbackDevLogDocPath('133'));
  });

  it('sanitizes non-numeric row IDs when building fallback paths', () => {
    expect(buildFallbackDevLogDocPath('custom row/../133')).toBe(
      'project-process/dev-logs/custom-row-133-development-log-summary.md',
    );
  });
});
