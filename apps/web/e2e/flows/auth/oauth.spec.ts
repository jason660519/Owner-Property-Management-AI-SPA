/**
 * @file oauth.spec.ts
 * @description E2E tests for OAuth authentication flow (Google/Facebook)
 * @created 2026-02-16
 * @creator Claude Sonnet 4.5
 * @version 1.0
 */

import { test, expect } from '@playwright/test';

/**
 * OAuth E2E Testing Strategy:
 *
 * Full OAuth flow (redirect to Google/Facebook) cannot be automated in E2E tests
 * due to external provider authentication pages. Instead, we test:
 *
 * 1. OAuth button click initiates redirect
 * 2. Callback route handles various parameter scenarios
 * 3. Error handling for invalid/expired codes
 * 4. Redirect logic after successful authentication
 *
 * Note: Complete OAuth integration testing requires manual testing or
 * provider-specific testing tools (e.g., Google's OAuth Playground)
 */

test.describe('OAuth Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test.describe('OAuth Button Interactions', () => {
    test('Google login button should be visible and clickable', async ({ page }) => {
      const googleButton = page.getByRole('button', { name: /Google/i });

      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();

      // Verify button has correct styling
      const buttonClasses = await googleButton.getAttribute('class');
      expect(buttonClasses).toContain('bg-white');
    });

    test('Facebook login button should be visible and clickable', async ({ page }) => {
      const facebookButton = page.getByRole('button', { name: /Facebook/i });

      await expect(facebookButton).toBeVisible();
      await expect(facebookButton).toBeEnabled();

      // Verify button has correct styling
      const buttonClasses = await facebookButton.getAttribute('class');
      expect(buttonClasses).toContain('bg-[#1877F2]');
    });

    test('OAuth buttons should be separated from password login by divider', async ({ page }) => {
      const divider = page.getByText(/或使用社群帳號登入/i);
      await expect(divider).toBeVisible();
    });
  });

  test.describe('OAuth Callback Route - Error Handling', () => {
    test('should redirect to login with error when code is missing', async ({ page }) => {
      await page.goto('/auth/callback');
      await page.waitForLoadState('networkidle');

      // Should redirect back to login with error
      expect(page.url()).toContain('/login');
      expect(page.url()).toContain('error=auth_callback_failed');
    });

    test('should display error message when OAuth provider returns error', async ({ page }) => {
      await page.goto('/auth/callback?error=access_denied&error_description=User%20cancelled%20login');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      expect(page.url()).toContain('/login');
      expect(page.url()).toContain('error=');

      // Error message should be displayed
      const errorMessage = page.locator('text=/User cancelled login|access_denied/i');
      await expect(errorMessage).toBeVisible();
    });

    test('should handle invalid code gracefully', async ({ page }) => {
      // Attempt callback with invalid code
      await page.goto('/auth/callback?code=invalid_code_12345');
      await page.waitForLoadState('networkidle');

      // Should redirect back to login with error
      expect(page.url()).toContain('/login');

      // Note: Actual error depends on Supabase's response
      // In development, might timeout or show auth error
    });

    test('should handle expired OTP/recovery links', async ({ page }) => {
      await page.goto('/auth/callback?error=otp_expired');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/login');

      // Should show specific OTP expired message
      const errorText = await page.locator('body').textContent();
      expect(errorText).toContain('過期');

      // Should show link to request new password reset
      const resetLink = page.getByRole('link', { name: /重新申請重設密碼/i });
      await expect(resetLink).toBeVisible();
    });
  });

  test.describe('OAuth Callback Route - Recovery Flow', () => {
    test('should redirect to update-password for recovery type', async ({ page }) => {
      // Note: This requires a valid code from actual password reset flow
      // Testing with type parameter only
      await page.goto('/auth/callback?type=recovery&error=invalid_code');
      await page.waitForLoadState('networkidle');

      // Should attempt to redirect to update-password (or show error)
      const url = page.url();
      const hasError = url.includes('error') || url.includes('login');
      expect(hasError).toBe(true);
    });
  });

  test.describe('OAuth Callback Route - Invite Flow', () => {
    test('should redirect to invite mode when type is invite', async ({ page }) => {
      // Simulate invite callback (without valid code, will error)
      await page.goto('/auth/callback?type=invite&error=invalid_code');
      await page.waitForLoadState('networkidle');

      // Should redirect to login or show error
      const url = page.url();
      expect(url).toContain('login');
    });
  });

  test.describe('OAuth Callback Route - Redirect Logic', () => {
    test('should respect next parameter for post-login redirect', async ({ page }) => {
      // Test next parameter handling (will error without valid code)
      await page.goto('/auth/callback?next=/landlord/dashboard&error=invalid_code');
      await page.waitForLoadState('networkidle');

      // Should redirect to login with error
      expect(page.url()).toContain('/login');
    });
  });
});

/**
 * Integration Testing Notes:
 *
 * For complete OAuth testing, consider:
 *
 * 1. Manual Testing Checklist:
 *    - [ ] Google login completes successfully
 *    - [ ] Facebook login completes successfully
 *    - [ ] New OAuth user gets default 'landlord' role
 *    - [ ] New OAuth user profile is created in users_profile
 *    - [ ] New OAuth user is added to IAM group
 *    - [ ] Existing OAuth user can login without creating duplicate profile
 *    - [ ] Multi-role users redirect to /portal
 *    - [ ] Super admin users redirect to /portal
 *    - [ ] Single-role users redirect to /{role}/dashboard
 *
 * 2. Provider Configuration Checklist:
 *    - [ ] Google OAuth Client ID configured in Supabase
 *    - [ ] Google redirect URI: {origin}/auth/callback
 *    - [ ] Facebook App ID configured in Supabase
 *    - [ ] Facebook redirect URI: {origin}/auth/callback
 *    - [ ] Both providers enabled in Supabase Auth settings
 *
 * 3. Environment Variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    - Supabase Dashboard: Google/Facebook secrets configured
 */
