import { test, expect, type Page } from '@playwright/test';

const FEATURE_NAME = 'Prompt and IDE Setting 升級（Manual/Auto 雙模式）';
const ISSUE_ID = 'iss_mock_132';
const ISSUE_KEY = 'VIS-132';
const AGENT_ID = 'agent_auto_132';
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

async function mockAutoLoopApis(page: Page) {
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
          title: '[Row 132] auto loop mock',
          status: 'todo',
        },
        issueUrl: `http://localhost:3187/issues/${ISSUE_KEY}`,
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
          title: '[Row 132] auto loop mock',
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
          runId: 'run_mock_132',
          runStatus: 'failed',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          stderrExcerpt: 'Adapter failed: mock failure for auto loop',
          exitCode: 1,
        },
      }),
    });
  });

  await page.route(`**/api/paperclip/issues/${ISSUE_ID}/cost`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: { issueId: ISSUE_ID } }),
    });
  });

  await page.route(`**/api/paperclip/agents/${AGENT_ID}/pause`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe('Row 132 Prompt Auto Loop', () => {
  test('trips circuit breaker and pauses agent in auto mode', async ({ page }) => {
    await mockAutoLoopApis(page);
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/superadmin/dashboard/project-progress');
    const session = await ensureSuperadminSession(page);
    if (!session.ready) {
      if (session.reason === 'missing_credentials') {
        test.skip(true, '[E2E WARNING][Row132] Missing E2E_SUPERADMIN_EMAIL/E2E_SUPERADMIN_PASSWORD');
      }
      throw new Error('[E2E][Row132] Superadmin login failed');
    }

    await page.goto('/superadmin/dashboard/project-progress');
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('Search features...').fill(FEATURE_NAME);
    await expect(page.getByText(FEATURE_NAME)).toBeVisible();

    await page.getByRole('button', { name: '設定 Prompt / 執行' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('IDE 開發工具').selectOption('Cursor');
    await page.getByLabel('今日工作類別').selectOption('devops');
    await page.getByLabel('執行模式').selectOption('auto');
    await page.getByLabel('最大重試次數').fill('1');
    await page.getByLabel('熔斷門檻（連續失敗）').fill('1');

    await page.getByRole('button', { name: '預覽送到 Paperclip' }).click();
    await expect(page.getByText('Paperclip Issue 預覽（尚未送出）')).toBeVisible();

    await page.getByRole('button', { name: '送出到 Paperclip' }).click();
    await expect(page.getByText('Auto 狀態：')).toBeVisible();
    await expect(page.getByText('tripped')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('agent 已自動 pause')).toBeVisible({ timeout: 15000 });
  });
});
