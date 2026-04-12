import { test, expect } from '@playwright/test';

test.describe('Project Progress – View freeze panes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/superadmin/dashboard/project-progress');
    await page.waitForLoadState('networkidle');
  });

  test('凍結第 1 row 會更新偏好並套用 sticky header', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i });
    await viewButton.click();
    await page.getByRole('button', { name: '凍結第 1 row' }).click();

    const freezeRowPref = await page.evaluate(
      () => window.localStorage.getItem('project_progress_freeze_row_v1'),
    );
    expect(freezeRowPref).toBe('1');

    const headerWrapper = page.locator(
      'div.bg-bg-primary.border.rounded-lg.shadow-sm div.sticky',
    );
    await expect(headerWrapper).toBeVisible();
  });

  test('凍結第 1 col 會更新偏好並讓第一欄成為 sticky', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i });
    await viewButton.click();
    await page.getByRole('button', { name: '凍結第 1 col' }).click();

    const freezeColPref = await page.evaluate(
      () => window.localStorage.getItem('project_progress_frozen_data_col_count_v2'),
    );
    expect(freezeColPref).toBe('1');

    const firstCell = page.locator('div.cursor-cell').first();
    const position = await firstCell.evaluate((el) =>
      window.getComputedStyle(el as HTMLElement).position,
    );
    expect(position).toBe('sticky');
  });
});
