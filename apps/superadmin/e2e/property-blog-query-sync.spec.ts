import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const PROPERTY_ID = '5d340656-5359-4bcf-88cf-f89f9ffbcee8';
const PROPERTY_BLOG_URL = `${BASE_URL}/superadmin/properties/${PROPERTY_ID}/edit?tab=advertisement_creators`;
const REFERENCE_URL = 'https://example.com/style-reference?b=2&a=1';

async function loginAsSuperadmin(page: Parameters<typeof test>[0]['page']) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'a0405142777@gmail.com');
  await page.fill('input[type="password"]', 'NewPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/superadmin/);
}

test.describe('Property blog query sync', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);
  });

  test('persists platform, style, and reference URL across reload', async ({ page }) => {
    await page.goto(PROPERTY_BLOG_URL);

    await expect(page.getByRole('button', { name: 'Google Blogger' })).toBeVisible();
    await page.getByRole('button', { name: 'Google Blogger' }).click();

    const corporateRow = page.locator('tr', { hasText: '商務簡潔' });
    await corporateRow.getByRole('button', { name: '套用此樣式' }).click();
    await expect(corporateRow.getByRole('button', { name: '已套用' })).toBeVisible();

    await page.getByRole('button', { name: /參考網頁風格/ }).click();
    await page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1').fill(REFERENCE_URL);
    await page.getByRole('button', { name: '套用', exact: true }).click();

    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogStylePreset=corporate/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);

    await page.reload();

    await expect(page).toHaveURL(/tab=advertisement_creators/);
    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogStylePreset=corporate/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);

    await expect(page.getByText('外部同步')).toBeVisible();
    await expect(page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1')).toHaveValue(REFERENCE_URL);
    await expect(corporateRow.getByRole('button', { name: '已套用' })).toBeVisible();
  });
});