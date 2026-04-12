import { test, expect, type Page } from '@playwright/test';

const FEATURE_NAME = 'Superadmin × Paperclip 開發流程整合（Prompt→Issue→Worktree→Diff→Merge）';
const ISSUE_ID = 'iss_mock_130';
const ISSUE_KEY = 'VIS-130';
const SLUG = 'row-130';
const BRANCH = `feature/paperclip-${SLUG}`;
const LOGIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL;
const LOGIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;

type SessionCheck =
  | { ready: true }
  | { ready: false; reason: 'missing_credentials' | 'login_failed' };

async function ensureSuperadminSession(page: Page): Promise<SessionCheck> {
  const loginHeading = page.getByRole('heading', { name: '管理員登入' });
  if (!(await loginHeading.isVisible({ timeout: 2000 }).catch(() => false))) {
    return { ready: true };
  }

  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    return { ready: false, reason: 'missing_credentials' };
  }

  await page.getByLabel('電子郵件*').fill(LOGIN_EMAIL);
  await page.getByLabel('密碼*').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: '登入' }).click();

  try {
    await expect(loginHeading).toBeHidden({ timeout: 15000 });
  } catch {
    return { ready: false, reason: 'login_failed' };
  }
  return { ready: true };
}

async function mockPaperclipApis(page: Page) {
  await page.route('**/api/paperclip/issues', async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        issue: {
          id: ISSUE_ID,
          issueKey: ISSUE_KEY,
          title: '[Row 130] mock issue',
          status: 'todo',
        },
        issueUrl: `http://localhost:3187/issues/${ISSUE_KEY}`,
        worktree: {
          slug: SLUG,
          branchName: BRANCH,
          hostPath: `/repo/.paperclip-worktrees/${SLUG}`,
          containerPath: `/workspace/.paperclip-worktrees/${SLUG}`,
          relativePath: `.paperclip-worktrees/${SLUG}`,
        },
      }),
    });
  });

  await page.route(`**/api/paperclip/issues/${ISSUE_ID}/status`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: {
          id: ISSUE_ID,
          title: '[Row 130] mock issue',
          status: 'in_progress',
          updatedAt: new Date().toISOString(),
          issueUrl: `http://localhost:3187/issues/${ISSUE_KEY}`,
          terminal: false,
        },
      }),
    });
  });

  await page.route(`**/api/paperclip/issues/${ISSUE_ID}/run-log**`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: {
          issueId: ISSUE_ID,
          runId: 'run_mock_130',
          runStatus: 'running',
          startedAt: new Date().toISOString(),
          stdoutExcerpt: 'Running mock task for row 130...',
        },
      }),
    });
  });

  await page.route(`**/api/paperclip/issues/${ISSUE_ID}/cost`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: {
          issueId: ISSUE_ID,
          runId: 'run_mock_130',
          costUsd: 0.0123,
          inputTokens: 1200,
          outputTokens: 340,
          runStatus: 'running',
        },
      }),
    });
  });

  await page.route('**/api/paperclip/worktrees', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        worktrees: [
          {
            slug: SLUG,
            branchName: BRANCH,
            path: `/workspace/.paperclip-worktrees/${SLUG}`,
            commitCount: 2,
            baseBranch: 'main',
            lastCommitSha: 'a'.repeat(40),
            lastCommitShortSha: 'aaaaaaa',
            lastCommitSubject: 'mock: paperclip row 130 update',
            lastCommitAt: new Date().toISOString(),
            prunable: false,
            issueId: ISSUE_ID,
            issueKey: ISSUE_KEY,
          },
        ],
      }),
    });
  });

  await page.route(`**/api/paperclip/worktrees/${SLUG}/diff`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        slug: SLUG,
        branch: BRANCH,
        baseBranch: 'main',
        stat: '1 file changed, 2 insertions(+)',
        diff: [
          `diff --git a/apps/superadmin/lib/paperclip/auto-route.ts b/apps/superadmin/lib/paperclip/auto-route.ts`,
          'index 1111111..2222222 100644',
          '--- a/apps/superadmin/lib/paperclip/auto-route.ts',
          '+++ b/apps/superadmin/lib/paperclip/auto-route.ts',
          '@@ -1,3 +1,5 @@',
          '+// mock diff for e2e row 130',
          "+export const MOCK_ROW_130 = 'ok';",
        ].join('\n'),
        truncated: false,
        diffTotalBytes: 240,
        commits: [
          {
            sha: 'a'.repeat(40),
            shortSha: 'aaaaaaa',
            subject: 'mock: paperclip row 130 update',
            author: 'E2E Bot',
            at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
}

test.describe('Row 130 Paperclip development loop', () => {
  test('can preview, send, and inspect worktree diff', async ({ page }) => {
    await mockPaperclipApis(page);

    page.on('dialog', dialog => dialog.accept());

    await page.goto('/superadmin/dashboard/project-progress');
    const session = await ensureSuperadminSession(page);
    if (!session.ready) {
      if (session.reason === 'missing_credentials') {
        const warnMsg =
          '[E2E WARNING][Row130] Missing E2E_SUPERADMIN_EMAIL/E2E_SUPERADMIN_PASSWORD; test skipped.';
        if (process.env.CI) {
          // Keep CI output explicit without forcing red build for credential-less pipelines.
          console.warn(warnMsg);
        }
        test.skip(true, warnMsg);
      }

      // Credentials were provided but login still failed => this must fail.
      throw new Error(
        '[E2E][Row130] Superadmin login failed with provided credentials; cannot continue required test flow.',
      );
    }

    await page.goto('/superadmin/dashboard/project-progress');
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('Search features...').fill(FEATURE_NAME);
    await expect(page.getByText(FEATURE_NAME)).toBeVisible();

    await page.getByRole('button', { name: '設定 Prompt / 執行' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('IDE 開發工具').selectOption('Cursor');
    await page.getByRole('button', { name: '預覽送到 Paperclip' }).click();
    await expect(page.getByText('Paperclip Issue 預覽（尚未送出）')).toBeVisible();

    await page.getByRole('button', { name: '送出到 Paperclip' }).click();
    await expect(page.getByText('Paperclip Issue 已建立')).toBeVisible();
    await expect(page.getByText(BRANCH)).toBeVisible();
    await expect(page.getByText('Live run log')).toBeVisible();

    await page.goto('/superadmin/dashboard/paperclip-worktrees');
    await expect(page.getByRole('heading', { name: 'Paperclip Worktrees' })).toBeVisible();
    await expect(page.getByText(BRANCH)).toBeVisible();

    await page.getByRole('button', { name: 'Diff' }).click();
    await expect(page.getByText(`feature/paperclip-${SLUG}`)).toBeVisible();
    await expect(page.getByText('mock: paperclip row 130 update')).toBeVisible();
  });
});
