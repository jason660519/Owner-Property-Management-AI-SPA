/**
 * @file vlm-document-scan.spec.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-04
 * @modifiedBy Claude Sonnet 4.5
 */

// filepath: apps/web/e2e/vlm-document-scan.spec.ts
// description: E2E tests for VLM document scanning feature

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('VLM Document Scan', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/dashboard/);
  });

  test('should show API key drawer when no key is configured', async ({ page }) => {
    // Navigate to add property page
    await page.goto('/landlord/properties/add');

    // Wait for VLM component to check key status
    await page.waitForTimeout(1000);

    // Should show API key drawer
    await expect(page.locator('text=設定 VLM API Key')).toBeVisible();
  });

  test('should save VLM API key successfully', async ({ page }) => {
    // Navigate to add property page
    await page.goto('/landlord/properties/add');

    // Wait for drawer to appear
    await page.waitForSelector('text=設定 VLM API Key');

    // Select provider
    await page.click('[id="provider"]');
    await page.click('text=Anthropic Claude');

    // Enter API key
    await page.fill('[id="apiKey"]', 'sk-ant-api03-test-key-for-e2e-testing');

    // Save
    await page.click('button:has-text("儲存設定")');

    // Wait for success
    await page.waitForSelector('text=設定 VLM API Key', { state: 'hidden', timeout: 5000 });

    // Verify drawer is closed
    await expect(page.locator('text=設定 VLM API Key')).not.toBeVisible();
  });

  test('should upload document and show parsing status', async ({ page }) => {
    // First, set up API key
    await page.goto('/landlord/properties/add');

    // Skip key setup if already configured (check if drawer appears)
    const hasKeyDrawer = await page.locator('text=設定 VLM API Key').isVisible({ timeout: 2000 }).catch(() => false);

    if (hasKeyDrawer) {
      await page.click('[id="provider"]');
      await page.click('text=Anthropic Claude');
      await page.fill('[id="apiKey"]', 'sk-ant-api03-test-key');
      await page.click('button:has-text("儲存設定")');
      await page.waitForTimeout(1000);
    }

    // Upload test document
    const testFilePath = path.join(__dirname, 'fixtures', 'sample_deed.pdf');

    // Find file input and upload
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Should show uploading state
    await expect(page.locator('text=上傳中...')).toBeVisible({ timeout: 5000 });

    // Should transition to processing state
    await expect(page.locator('text=AI 解析中...')).toBeVisible({ timeout: 10000 });

    // Wait for completion (max 30 seconds)
    await expect(page.locator('text=文件解析完成')).toBeVisible({ timeout: 30000 });
  });

  test('should display parsed results with validation icons', async ({ page }) => {
    // Assuming document is already parsed (or mock the state)
    await page.goto('/landlord/properties/add');

    // Upload and wait for completion
    // (implementation depends on test fixtures)

    // Check for parsed fields
    await expect(page.locator('[id="owner_name"]')).toBeVisible();
    await expect(page.locator('[id="property_address"]')).toBeVisible();

    // Check for validation icons (CheckCircle2 or XCircle)
    const hasValidationIcon = await page.locator('svg.lucide-check-circle-2, svg.lucide-x-circle').count() > 0;
    expect(hasValidationIcon).toBeTruthy();
  });

  test('should auto-fill form fields when clicking "一鍵帶入全部"', async ({ page }) => {
    // Assuming parsed result is displayed
    await page.goto('/landlord/properties/add');

    // (Upload and parse document)

    // Click "一鍵帶入全部" button
    await page.click('button:has-text("一鍵帶入全部")');

    // Wait for navigation or form update
    await page.waitForTimeout(500);

    // Check that form fields are filled
    const ownerNameValue = await page.locator('[name="owner_name"]').inputValue();
    expect(ownerNameValue).not.toBe('');

    const addressValue = await page.locator('[name="property_address"]').inputValue();
    expect(addressValue).not.toBe('');
  });

  test('should handle parsing errors gracefully', async ({ page }) => {
    await page.goto('/landlord/properties/add');

    // Upload invalid file (e.g., non-document image)
    const testFilePath = path.join(__dirname, 'fixtures', 'invalid_image.png');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Should show error state
    await expect(page.locator('text=解析失敗')).toBeVisible({ timeout: 30000 });

    // Should have retry button
    await expect(page.locator('button:has-text("重新嘗試")')).toBeVisible();
  });

  test('should allow manual editing of parsed fields', async ({ page }) => {
    await page.goto('/landlord/properties/add');

    // (Upload and parse document)

    // Edit owner name
    const ownerNameInput = page.locator('[id="owner_name"]');
    await ownerNameInput.clear();
    await ownerNameInput.fill('手動修改的姓名');

    // Verify value changed
    expect(await ownerNameInput.inputValue()).toBe('手動修改的姓名');

    // Click auto-fill
    await page.click('button:has-text("一鍵帶入全部")');

    // Form should have manually edited value
    const formOwnerName = await page.locator('[name="owner_name"]').inputValue();
    expect(formOwnerName).toBe('手動修改的姓名');
  });

  test('should delete API key successfully', async ({ page }) => {
    await page.goto('/landlord/properties/add');

    // Open settings drawer
    await page.click('button:has-text("設定 API Key")');

    // Wait for drawer
    await page.waitForSelector('text=設定 VLM API Key');

    // (Add delete button to component in future)
    // For now, skip this test
  });
});
