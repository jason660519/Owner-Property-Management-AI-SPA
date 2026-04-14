/**
 * E2E tests for Row 020 — 聯絡我們>發送訊息功能 (Contact Us > Send Message)
 *
 * These Playwright tests target the web app (localhost:3000/contact).
 * The suite covers:
 * - Page renders hero section and contact form
 * - Form fields are present and interactable
 * - Source context is displayed when query params are provided
 * - Invalid source params are rejected and not displayed
 * - Form submission shows success state with lead reference
 * - Consent checkbox is required
 */

import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const CONTACT_URL = `${WEB_URL}/contact`;

// ---------------------------------------------------------------------------
// Contact page structure
// ---------------------------------------------------------------------------

test.describe('聯絡我們頁面結構', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONTACT_URL);
    await page.waitForLoadState('networkidle');
  });

  test('應顯示「聯絡我們」標題', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: '聯絡我們', level: 1 }),
    ).toBeVisible();
  });

  test('應顯示聯絡表單的基本欄位', async ({ page }) => {
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.locator('select[name="inquiryType"]')).toBeVisible();
  });

  test('應顯示「發送訊息」按鈕', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /發送訊息/i }),
    ).toBeVisible();
  });

  test('「詢問類型」預設為「一般諮詢」', async ({ page }) => {
    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      '一般諮詢',
    );
  });
});

// ---------------------------------------------------------------------------
// Source context (query params)
// ---------------------------------------------------------------------------

test.describe('來源參數顯示', () => {
  test('pricing-cta 入口：顯示來自公開頁面摘要', async ({ page }) => {
    await page.goto(
      `${CONTACT_URL}?inquiryType=合作提案&sourcePath=/pricing&entryPoint=pricing-cta`,
    );
    await page.waitForLoadState('networkidle');

    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      '合作提案',
    );
    await expect(page.getByText(/來自公開頁面/i)).toBeVisible();
  });

  test('property-detail 入口：顯示案件來源摘要', async ({ page }) => {
    await page.goto(
      `${CONTACT_URL}?entryPoint=property-detail-viewing&propertyId=sale-2&propertyTitle=台北大安整合案件`,
    );
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('案件來源')).toBeVisible();
    await expect(page.getByText('台北大安整合案件')).toBeVisible();
    await expect(page.getByText('從案件詳情頁發起預約看房')).toBeVisible();
  });

  test('不合法的 entryPoint 不應顯示任何來源摘要', async ({ page }) => {
    await page.goto(
      `${CONTACT_URL}?sourcePath=https://evil.example&entryPoint=javascript:alert(1)`,
    );
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/來自公開頁面/i)).not.toBeVisible();
    await expect(
      page.getByText(/從案件詳情頁發起|從收費方式頁送出/i),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Form submission (lead capture)
// ---------------------------------------------------------------------------

test.describe('表單發送功能', () => {
  test('完整填寫並提交表單後顯示 Lead 編號', async ({ page }) => {
    await page.goto(
      `${CONTACT_URL}?inquiryType=合作提案&sourcePath=/pricing&entryPoint=pricing-cta`,
    );
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('E2E Row020 Tester');
    await page
      .locator('input[name="email"]')
      .fill(`row020-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('0912345678');
    await page
      .locator('textarea[name="message"]')
      .fill('這是 Row 020 Playwright 驗收測試訊息。');
    await page
      .getByLabel(/我同意 Owner AI 處理我的個人資料以回應此詢問/i)
      .check();

    await page.getByRole('button', { name: /發送訊息/i }).click();

    await expect(page.getByText(/發送成功/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Lead 編號/i)).toBeVisible();
  });

  test('未勾選同意條款時無法提交', async ({ page }) => {
    await page.goto(CONTACT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('textarea[name="message"]').fill('Test message');
    // Intentionally skip checking the consent checkbox

    await page.getByRole('button', { name: /發送訊息/i }).click();

    // Should not show success state
    await expect(page.getByText(/發送成功/i)).not.toBeVisible();
    // Form should still be visible
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('成功後顯示「發送另一則訊息」按鈕', async ({ page }) => {
    await page.goto(CONTACT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Reset Tester');
    await page
      .locator('input[name="email"]')
      .fill(`reset-${Date.now()}@example.com`);
    await page.locator('textarea[name="message"]').fill('Reset flow test message.');
    await page
      .getByLabel(/我同意 Owner AI 處理我的個人資料以回應此詢問/i)
      .check();

    await page.getByRole('button', { name: /發送訊息/i }).click();
    await expect(page.getByText(/發送成功/i)).toBeVisible({ timeout: 15000 });

    const resetBtn = page.getByRole('button', { name: /發送另一則訊息/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Form should reappear
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });
});
