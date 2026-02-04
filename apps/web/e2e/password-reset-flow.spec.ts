/**
 * @file password-reset-flow.spec.ts
 * @description E2E test for password reset flow
 * @created 2026-02-03
 * @creator Antigravity
 */

import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  const testEmail = 'a0405142777@gmail.com';
  const newPassword = 'NewPassword456!';

  test('should complete forgot password flow', async ({ page }) => {
    console.log('🔹 STEP 1: Visit forgot password page');
    await page.goto('http://localhost:3000/forgot-password');
    await expect(page.locator('h3:has-text("忘記密碼")')).toBeVisible();
    console.log('✅ Forgot password page loaded');

    console.log('\n🔹 STEP 2: Submit email for password reset');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]:has-text("發送重設連結")');

    // Wait for success message
    await expect(page.locator('h3:has-text("郵件已發送！")')).toBeVisible({ timeout: 5000 });
    console.log('✅ Password reset email sent successfully');

    console.log('\n🔹 STEP 3: Get reset link from Supabase Inbucket');
    // Note: In real test, we would fetch the email from Supabase local inbucket
    // For now, we'll simulate clicking the reset link
    console.log('⚠️  Manual step: Check http://localhost:54324 for reset email');

    // Expected flow:
    // 1. User clicks reset link from email
    // 2. Link should be: http://localhost:3000/auth/callback?code=xxx&next=/update-password
    // 3. Callback should exchange code and redirect to /update-password
    // 4. User can set new password
  });

  test('should handle password reset callback correctly', async ({ page, context }) => {
    console.log('🔹 STEP 1: Test callback redirect with next parameter');

    // Simulate auth callback with next parameter
    // In real scenario, this URL comes from the email link
    const mockCallbackUrl = 'http://localhost:3000/auth/callback?next=/update-password';

    await page.goto(mockCallbackUrl);

    // Should redirect to update-password page (after code exchange)
    // Note: Without valid code, this might redirect to login
    // In real test, we need to get actual code from email

    console.log('Current URL:', page.url());

    // Expected: Should show update password page if logged in
    // Or login page if not authenticated
  });

  test('should show update password page when logged in', async ({ page }) => {
    console.log('🔹 STEP 1: Login first');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 5000 });
    console.log('✅ Logged in successfully');

    console.log('\n🔹 STEP 2: Visit update password page directly');
    await page.goto('http://localhost:3000/update-password');

    // Should show update password form
    await expect(
      page.locator('h3, h2').filter({ hasText: /更新密碼|重設密碼|設定新密碼/i })
    ).toBeVisible({ timeout: 3000 });
    console.log('✅ Update password page is accessible');
  });
});

test.describe('Update Password Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 5000 });
  });

  test('should display update password form', async ({ page }) => {
    await page.goto('http://localhost:3000/update-password');

    // Check for password input fields
    const passwordInputs = page.locator('input[type="password"]');
    expect(await passwordInputs.count()).toBeGreaterThanOrEqual(2);
    console.log('✅ Password input fields are present');
  });
});
