import { test, expect } from '@playwright/test';

test.describe('IAM – View freeze panes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/superadmin/dashboard/iam-management');
    await page.waitForLoadState('networkidle');
  });

  test('凍結第 1 row 會讓 IAM matrix header 變成 sticky', async ({ page }) => {
    const viewButton = page.getByTitle('檢視選項').first();
    await viewButton.click();
    await page.getByRole('button', { name: '凍結第 1 row' }).click();

    const thead = page.locator('table thead').first();
    const position = await thead.evaluate((el) =>
      window.getComputedStyle(el as HTMLElement).position,
    );
    expect(position).toBe('sticky');
  });

  test('凍結第 1 col 會讓 IAM matrix 第一欄成為 sticky', async ({ page }) => {
    const viewButton = page.getByTitle('檢視選項').first();
    await viewButton.click();
    await page.getByRole('button', { name: '凍結第 1 col' }).click();

    const firstBodyCell = page.locator('tbody tr td').first();
    const position = await firstBodyCell.evaluate((el) =>
      window.getComputedStyle(el as HTMLElement).position,
    );
    expect(position).toBe('sticky');
  });
});

