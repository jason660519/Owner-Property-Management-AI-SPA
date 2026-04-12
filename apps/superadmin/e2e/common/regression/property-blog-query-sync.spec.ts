import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../../utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';
const PROPERTY_ID = '5d340656-5359-4bcf-88cf-f89f9ffbcee8';
const PROPERTY_BLOG_URL = `${BASE_URL}/superadmin/properties/${PROPERTY_ID}/edit?tab=advertisement_creators`;
const REFERENCE_URL = 'https://example.com/style-reference?b=2&a=1';
const BUILDER_DRAFT_STORAGE_KEY = `property-advertisement-builder:${PROPERTY_ID}`;

test.describe('Property blog query sync', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('keeps preset and reference modes mutually exclusive across reload', async ({ page }) => {
    await page.goto(PROPERTY_BLOG_URL);
    await expect(page.getByRole('button', { name: 'Google Blogger' })).toBeVisible();
    await page.getByRole('button', { name: 'Google Blogger' }).click();
    const corporateRow = page.locator('tr', { hasText: '商務簡潔' });
    await corporateRow.getByRole('button', { name: '套用此樣式' }).click();
    await expect(corporateRow.getByRole('button', { name: '已套用' })).toBeVisible();
    await page.getByRole('button', { name: '參考網址模式' }).click();
    await page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1').fill(REFERENCE_URL);
    await page.getByRole('button', { name: '套用', exact: true }).click();
    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);
    await expect(page).not.toHaveURL(/blogStylePreset=/);
    await page.reload();
    await expect(page).toHaveURL(/tab=advertisement_creators/);
    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);
    await expect(page).not.toHaveURL(/blogStylePreset=/);
    await expect(page.getByRole('button', { name: '參考網址模式' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1')).toHaveValue(REFERENCE_URL);
    await page.getByRole('button', { name: '系統模板' }).click();
    await expect(page).not.toHaveURL(/blogReferenceUrl=/);
    const refreshedCorporateRow = page.locator('tr', { hasText: '商務簡潔' });
    await expect(refreshedCorporateRow.getByRole('button', { name: '套用此樣式' })).toBeVisible();
  });

  test('restores builder draft state on bare URL and still allows query params to override it', async ({ page }) => {
    await page.goto(PROPERTY_BLOG_URL);
    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, BUILDER_DRAFT_STORAGE_KEY);
    await page.goto(`${PROPERTY_BLOG_URL}&blogPlatform=google_blogger&blogStylePreset=corporate`);
    await expect(page.getByRole('button', { name: 'Google Blogger' })).toBeVisible();
    await expect(page.locator('tr', { hasText: '商務簡潔' }).getByRole('button', { name: '已套用' })).toBeVisible();
    await page.getByRole('button', { name: '參考網址模式' }).click();
    await page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1').fill(REFERENCE_URL);
    await page.getByRole('button', { name: '套用', exact: true }).click();
    await page.getByRole('checkbox', { name: '謄本連結' }).check();
    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);
    await expect(page).not.toHaveURL(/blogStylePreset=/);
    await page.waitForTimeout(1200);
    await page.goto(PROPERTY_BLOG_URL);
    await expect(page.getByRole('button', { name: 'Google Blogger' })).toBeVisible();
    await expect(page.getByRole('button', { name: '參考網址模式' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1')).toHaveValue(REFERENCE_URL);
    await expect(page.getByRole('checkbox', { name: '謄本連結' })).toBeChecked();
    await expect(page).toHaveURL(/tab=advertisement_creators/);
    await expect(page).toHaveURL(/blogPlatform=google_blogger/);
    await expect(page).toHaveURL(/blogReferenceUrl=https%3A%2F%2Fexample.com%2Fstyle-reference%3Fb%3D2%26a%3D1/);
    await page.goto(`${PROPERTY_BLOG_URL}&blogPlatform=supabase&blogStylePreset=bright_clean`);
    await expect(page.getByRole('button', { name: '系統模板' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '地端 Supabase' })).toBeVisible();
    await expect(page.locator('tr', { hasText: '清爽明亮' }).getByRole('button', { name: '已套用' })).toBeVisible();
    await expect(page.getByPlaceholder('https://a0405142777.wixsite.com/108-en-lease1')).toHaveValue('');
    await expect(page.getByRole('checkbox', { name: '謄本連結' })).toBeChecked();
    await expect(page).toHaveURL(/blogPlatform=supabase/);
    await expect(page).toHaveURL(/blogStylePreset=bright_clean/);
    await expect(page).not.toHaveURL(/blogReferenceUrl=/);
  });
});
