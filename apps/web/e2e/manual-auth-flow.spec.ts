/**
 * @file manual-auth-flow.spec.ts
 * @description Manual testing script for complete authentication flow
 * @created 2026-02-03
 * @creator Antigravity
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test User',
};

test.describe('Complete Authentication Flow', () => {
  test('should complete registration → login → password reset flow', async ({ page }) => {
    // ============================================
    // STEP 1: Registration
    // ============================================
    console.log('🔹 STEP 1: Testing Registration Flow');

    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.fill('input[name="fullName"]', TEST_USER.fullName);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);

    // Check terms checkbox if exists
    const termsCheckbox = page.locator('input[type="checkbox"][name="agreeToTerms"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message (use first() to avoid strict mode violation)
    await expect(page.locator('text=/註冊成功|成功|success/i').first()).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Registration successful');

    // Wait for 3-second redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
    console.log('✅ Auto-redirected to login page after 3 seconds');

    // ============================================
    // STEP 2: Login
    // ============================================
    console.log('🔹 STEP 2: Testing Login Flow');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in and redirected to dashboard');

    // ============================================
    // STEP 3: Verify UserNav Component
    // ============================================
    console.log('🔹 STEP 3: Verifying UserNav Component');

    // Check if UserNav is visible (avatar or user menu)
    const userNav = page
      .locator(
        '[role="button"]:has-text("' +
          TEST_USER.email +
          '"), div:has-text("' +
          TEST_USER.fullName +
          '")'
      )
      .first();
    await expect(userNav).toBeVisible({ timeout: 5000 });
    console.log('✅ UserNav component is visible on dashboard');

    // Click UserNav to open dropdown
    await userNav.click();
    await expect(page.locator('text=/Profile|Settings|Sign out/i')).toBeVisible({ timeout: 2000 });
    console.log('✅ UserNav dropdown menu opens correctly');

    // ============================================
    // STEP 4: Logout
    // ============================================
    console.log('🔹 STEP 4: Testing Logout');

    await page.click('text=/Sign out|登出/i');
    await page.waitForURL('**/login', { timeout: 5000 });
    console.log('✅ Successfully logged out and redirected to login');

    // ============================================
    // STEP 5: Password Reset Flow
    // ============================================
    console.log('🔹 STEP 5: Testing Password Reset Flow');

    // Go to forgot password page
    await page.goto('http://localhost:3000/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=/郵件已發送|email sent|success/i')).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Password reset email sent');

    // ============================================
    // STEP 6: Check Mailpit for Reset Email
    // ============================================
    console.log('🔹 STEP 6: Checking Mailpit for password reset email');

    // Open Mailpit in new page
    const mailpitPage = await page.context().newPage();
    await mailpitPage.goto('http://127.0.0.1:54324');
    await mailpitPage.waitForLoadState('networkidle');

    // Find the password reset email
    const emailLink = mailpitPage.locator(`text="${TEST_USER.email}"`).first();
    await expect(emailLink).toBeVisible({ timeout: 5000 });
    await emailLink.click();

    // Extract reset link from email body
    const emailFrame = mailpitPage.frameLocator('iframe[name="preview-html"]');
    const resetLink = await emailFrame
      .locator('a[href*="/auth/callback"]')
      .first()
      .getAttribute('href');

    if (!resetLink) {
      throw new Error('Reset link not found in email');
    }
    console.log('✅ Password reset link found in email');

    await mailpitPage.close();

    // ============================================
    // STEP 7: Use Reset Link
    // ============================================
    console.log('🔹 STEP 7: Using password reset link');

    await page.goto(resetLink);
    await page.waitForURL('**/update-password', { timeout: 10000 });
    console.log('✅ Redirected to update-password page via callback');

    // Update password
    const newPassword = 'NewPassword123!';
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=/密碼更新成功|success/i')).toBeVisible({ timeout: 5000 });
    console.log('✅ Password updated successfully');

    // Wait for 3-second redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
    console.log('✅ Auto-redirected to login page after password update');

    // ============================================
    // STEP 8: Login with New Password
    // ============================================
    console.log('🔹 STEP 8: Testing login with new password');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in with new password');

    // ============================================
    // STEP 9: Test Middleware Redirects
    // ============================================
    console.log('🔹 STEP 9: Testing middleware redirects (while logged in)');

    // Try to access /login while logged in
    await page.goto('http://localhost:3000/login');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('✅ Middleware: /login → dashboard redirect works');

    // Try to access /register while logged in
    await page.goto('http://localhost:3000/register');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('✅ Middleware: /register → dashboard redirect works');

    // Try to access /forgot-password while logged in
    await page.goto('http://localhost:3000/forgot-password');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('✅ Middleware: /forgot-password → dashboard redirect works');

    console.log('\n🎉 ALL TESTS PASSED! Complete authentication flow verified.');
  });
});
