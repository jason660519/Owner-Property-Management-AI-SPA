import {
  buildProjectFileHref,
  canUseProjectFilePath,
  isSafeProjectRelativePath,
} from './path-utils';

describe('path-utils', () => {
  it('accepts safe project-relative paths', () => {
    expect(isSafeProjectRelativePath('apps/superadmin/unit_test/131')).toBe(true);
    expect(isSafeProjectRelativePath('project-process/features/spec.md')).toBe(true);
    expect(isSafeProjectRelativePath('apps/superadmin/unit_test/131/')).toBe(true);
  });

  it('rejects unsafe paths', () => {
    expect(isSafeProjectRelativePath('/etc/passwd')).toBe(false);
    expect(isSafeProjectRelativePath('../secrets')).toBe(false);
    expect(isSafeProjectRelativePath('apps/superadmin/../secrets')).toBe(false);
    expect(isSafeProjectRelativePath('https://example.com/evil')).toBe(false);
  });

  it('checks allowed prefixes', () => {
    expect(canUseProjectFilePath('apps/superadmin/unit_test/131', ['apps/superadmin/'])).toBe(true);
    expect(canUseProjectFilePath('project-process/features/spec.md', ['apps/superadmin/'])).toBe(false);
  });

  it('builds href only for safe + allowed paths', () => {
    expect(buildProjectFileHref('apps/superadmin/unit_test/131', ['apps/superadmin/'])).toBe(
      '/superadmin/project-file?path=apps%2Fsuperadmin%2Funit_test%2F131',
    );
    expect(buildProjectFileHref('apps/web/e2e/131', ['apps/superadmin/'])).toBeNull();
  });
});
