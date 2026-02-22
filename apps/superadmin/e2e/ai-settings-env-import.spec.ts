import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const SETTINGS_URL = `${BASE_URL}/superadmin/settings/api_key_and_model_setting`;

test.describe('AI Settings – env import shows keys without page refresh', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/superadmin/);
  });

  test('after 導入，儲存並驗證全部金鑰, saved key appears in list without manual refresh', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Open batch import panel
    await page.getByRole('button', { name: '批量導入API KEY' }).click();
    await expect(page.getByPlaceholder(/支援 .env 或 JSON/)).toBeVisible();

    // Paste env content (use a dummy key that will be stored)
    const envContent = 'OPENAI_API_KEY=sk-proj-test123456789012345678901234567890123';
    await page.getByPlaceholder(/支援 .env 或 JSON/).fill(envContent);

    // Wait for "辨識到 1 個" so button is enabled
    await expect(page.getByText(/辨識到 1 個/)).toBeVisible({ timeout: 3000 });

    // Click 導入，儲存並驗證全部金鑰
    await page.getByRole('button', { name: /導入，儲存並驗證全部金鑰/ }).click();

    // Wait for success: either "已導入" or loading then list update
    await expect(
      page.getByText(/已導入/).or(page.locator('[data-testid="provider-card-openai"]').getByText(/驗證金鑰/))
    ).toBeVisible({ timeout: 15000 });

    // Without reloading the page, the OpenAI card should show saved state (masked key or 驗證金鑰 button)
    const openaiCard = page.locator('[data-testid="provider-card-openai"]');
    await expect(openaiCard).toBeVisible();
    // Saved state: either masked key (sk-x... or similar) or the "驗證金鑰" button
    await expect(
      openaiCard.getByRole('button', { name: '驗證金鑰' }).or(openaiCard.getByText(/sk-/))
    ).toBeVisible({ timeout: 5000 });
  });
});
