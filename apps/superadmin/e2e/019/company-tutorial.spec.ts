/**
 * E2E tests for Row 019 — 公司產品教學 (Company Product Tutorial)
 *
 * These Playwright tests target the web app (localhost:3000).
 * The suite covers:
 * - Tutorial role selection page renders correctly
 * - Navigation to role-specific tutorial pages
 * - Progress bar renders (0% on fresh state)
 * - "標記為已完成" button is interactive
 * - Completion badge appears after all steps done (via localStorage seed)
 */

import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const TUTORIAL_URL = `${WEB_URL}/tutorial`;

// ---------------------------------------------------------------------------
// Tutorial role selection page
// ---------------------------------------------------------------------------

test.describe('教學角色選擇頁', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TUTORIAL_URL);
  });

  test('應顯示「產品教學」標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '產品教學', level: 1 })).toBeVisible();
  });

  test('應顯示三個角色卡片', async ({ page }) => {
    await expect(page.getByRole('link', { name: /開始房東版教學/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /開始租客版教學/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /開始買家版教學/ })).toBeVisible();
  });

  test('應顯示「如何使用教學」說明', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '如何使用教學', level: 2 })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 房東版教學頁
// ---------------------------------------------------------------------------

test.describe('房東版教學頁', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing tutorial progress to start fresh
    await page.goto(TUTORIAL_URL);
    await page.evaluate(() => {
      localStorage.removeItem('ownerai_tutorial_progress_landlord');
    });
    await page.goto(`${TUTORIAL_URL}/landlord`);
  });

  test('應顯示「房東版教學」標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '房東版教學', level: 1 })).toBeVisible();
  });

  test('應顯示返回連結', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /返回角色選擇/ });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/tutorial');
  });

  test('初始進度應為 0%', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  test('應顯示所有 4 個教學步驟', async ({ page }) => {
    await expect(page.getByText('建立帳號與選擇角色')).toBeVisible();
    await expect(page.getByText('刊登出租物件')).toBeVisible();
    await expect(page.getByText('管理帶看與詢問')).toBeVisible();
    await expect(page.getByText('追蹤租約與點交進度')).toBeVisible();
  });

  test('點擊第一個「標記為已完成」後進度應更新', async ({ page }) => {
    const completeButtons = page.getByRole('button', { name: /標記步驟.*已完成/ });
    // Click the first step's complete button
    await completeButtons.first().click();
    // Progress bar should show 25% (1/4 steps)
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  test('完成後的步驟應顯示已完成標示', async ({ page }) => {
    const completeButtons = page.getByRole('button', { name: /標記步驟.*已完成/ });
    await completeButtons.first().click();
    // Should now show "✓ 已完成" text near step 1
    const completedLabels = page.getByText('✓ 已完成');
    await expect(completedLabels.first()).toBeVisible();
  });

  test('完成所有步驟後應顯示完成徽章', async ({ page }) => {
    // Seed all landlord steps as complete via localStorage
    await page.evaluate(() => {
      const progress = {
        completedStepIds: ['landlord-01', 'landlord-02', 'landlord-03', 'landlord-04'],
        lastStepId: 'landlord-04',
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem('ownerai_tutorial_progress_landlord', JSON.stringify(progress));
    });
    await page.reload();
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText('恭喜完成所有教學步驟！')).toBeVisible();
    await expect(page.getByText(/房東版完成徽章/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 租客版教學頁
// ---------------------------------------------------------------------------

test.describe('租客版教學頁', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TUTORIAL_URL);
    await page.evaluate(() => {
      localStorage.removeItem('ownerai_tutorial_progress_tenant');
    });
    await page.goto(`${TUTORIAL_URL}/tenant`);
  });

  test('應顯示「租客版教學」標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '租客版教學', level: 1 })).toBeVisible();
  });

  test('應顯示 3 個步驟', async ({ page }) => {
    await expect(page.getByText('搜尋合適物件')).toBeVisible();
    await expect(page.getByText('申請看屋')).toBeVisible();
    await expect(page.getByText('追蹤租約狀態')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 買家版教學頁
// ---------------------------------------------------------------------------

test.describe('買家版教學頁', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TUTORIAL_URL);
    await page.evaluate(() => {
      localStorage.removeItem('ownerai_tutorial_progress_buyer');
    });
    await page.goto(`${TUTORIAL_URL}/buyer`);
  });

  test('應顯示「買家版教學」標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '買家版教學', level: 1 })).toBeVisible();
  });

  test('應顯示 4 個步驟', async ({ page }) => {
    await expect(page.getByText('建立買家偏好')).toBeVisible();
    await expect(page.getByText('瀏覽物件與詢問')).toBeVisible();
    await expect(page.getByText('追蹤要約與斡旋金')).toBeVisible();
    await expect(page.getByText('代書過戶協作')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 無效角色 → 404
// ---------------------------------------------------------------------------

test.describe('無效角色路由', () => {
  test('無效 role 應回傳 404', async ({ page }) => {
    const response = await page.goto(`${TUTORIAL_URL}/invalid-role`);
    expect(response?.status()).toBe(404);
  });
});
