import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import { signInWithGoogle, signInWithFacebook } from '@/lib/supabase/auth';
import { signInWithPasswordAction, getUserRoles, syncUserRolesToAuthMetadata } from '@/app/actions/auth';

// Mock Server Actions (password login flow uses these, not signInWithPassword from client)
jest.mock('@/app/actions/auth', () => ({
  signInWithPasswordAction: jest.fn(),
  getUserRoles: jest.fn(),
  syncUserRolesToAuthMetadata: jest.fn(),
  acceptInviteCode: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  signInWithGoogle: jest.fn(),
  signInWithFacebook: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('LoginPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('應該正確渲染登入表單', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/電子郵件/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密碼/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/記住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^登入$/ })).toBeInTheDocument();
    expect(screen.getByText(/忘記密碼/i)).toBeInTheDocument();
  });

  test('應該顯示表單驗證錯誤', async () => {
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /^登入$/ });
    await user.click(submitButton);
    
    expect(await screen.findByText(/請輸入有效的電子郵件地址/i)).toBeInTheDocument();
    expect(screen.getByText(/密碼至少需要 8 個字元/i)).toBeInTheDocument();
  });

  test('應該成功登入並呼叫 getUserRoles、sync 後導向 Portal', async () => {
    (signInWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, userId: 'user-123' });
    (getUserRoles as jest.Mock).mockResolvedValue({ success: true, roles: ['landlord'] });
    (syncUserRolesToAuthMetadata as jest.Mock).mockResolvedValue({ success: true });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/電子郵件/i), 'landlord@example.com');
    await user.type(screen.getByLabelText(/密碼/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /^登入$/ }));

    await waitFor(() => {
      expect(signInWithPasswordAction).toHaveBeenCalledWith('landlord@example.com', 'ValidPass123');
      expect(getUserRoles).toHaveBeenCalledWith('user-123');
      expect(syncUserRolesToAuthMetadata).toHaveBeenCalledWith('user-123', ['landlord']);
    });
    // 實際 window.location.href = '/portal' 由 E2E 驗證
  });

  test('應該處理登入失敗', async () => {
    const errorMessage = 'Invalid credentials';
    (signInWithPasswordAction as jest.Mock).mockResolvedValue({ success: false, error: errorMessage });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/電子郵件/i), 'test@example.com');
    await user.type(screen.getByLabelText(/密碼/i), 'WrongPass123');
    await user.click(screen.getByRole('button', { name: /^登入$/ }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('應該處理 Google 登入', async () => {
    render(<LoginPage />);
    const googleButton = screen.getByRole('button', { name: /Google/i });
    await user.click(googleButton);
    expect(signInWithGoogle).toHaveBeenCalled();
  });

  test('應該處理 Facebook 登入', async () => {
    render(<LoginPage />);
    const facebookButton = screen.getByRole('button', { name: /Facebook/i });
    await user.click(facebookButton);
    expect(signInWithFacebook).toHaveBeenCalled();
  });

  test('應該顯示 Google 登入錯誤', async () => {
    const errorMessage = 'Google 登入失敗';
    (signInWithGoogle as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<LoginPage />);
    const googleButton = screen.getByRole('button', { name: /Google/i });
    await user.click(googleButton);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('應該顯示 Facebook 登入錯誤', async () => {
    const errorMessage = 'Facebook 登入失敗';
    (signInWithFacebook as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<LoginPage />);
    const facebookButton = screen.getByRole('button', { name: /Facebook/i });
    await user.click(facebookButton);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('應該顯示通用 OAuth 錯誤訊息', async () => {
    (signInWithGoogle as jest.Mock).mockRejectedValue(new Error('Unknown error'));

    render(<LoginPage />);
    const googleButton = screen.getByRole('button', { name: /Google/i });
    await user.click(googleButton);

    // Should display the error thrown by signInWithGoogle
    expect(await screen.findByText(/Unknown error/i)).toBeInTheDocument();
  });

  describe('記住我功能測試 (安全版本 - 僅儲存 Email)', () => {
    /**
     * Security: Password is NEVER stored in localStorage
     * Only email is stored for form pre-fill convenience
     * Session persistence is handled by Supabase's token management
     */

    test('勾選「記住我」後應該只儲存 email（不儲存密碼以確保安全）', async () => {
      (signInWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, userId: 'user-123' });
      (getUserRoles as jest.Mock).mockResolvedValue({ success: true, roles: ['landlord'] });
      (syncUserRolesToAuthMetadata as jest.Mock).mockResolvedValue({ success: true });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /^登入$/ });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPass123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        // Email should be stored
        expect(localStorage.getItem('opm_remembered_email')).toBe('test@example.com');
        // Password should NEVER be stored (security requirement)
        expect(localStorage.getItem('rememberedPassword')).toBeNull();
        expect(localStorage.getItem('opm_remembered_password')).toBeNull();
      });
    });

    test('取消勾選「記住我」後應該清除 localStorage 中的 email', async () => {
      (signInWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, userId: 'user-123' });
      (getUserRoles as jest.Mock).mockResolvedValue({ success: true, roles: ['landlord'] });
      (syncUserRolesToAuthMetadata as jest.Mock).mockResolvedValue({ success: true });

      localStorage.setItem('opm_remembered_email', 'old@example.com');

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /^登入$/ });

      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');
      await user.type(passwordInput, 'NewPass123');

      // Ensure rememberMe is unchecked
      if ((rememberMeCheckbox as HTMLInputElement).checked) {
        await user.click(rememberMeCheckbox);
      }

      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('opm_remembered_email')).toBeNull();
        expect(localStorage.getItem('rememberedEmail')).toBeNull();
      });
    });

    test('重新載入頁面時應該只自動填入已儲存的 email（密碼欄位保持空白）', async () => {
      // Set up localStorage with email only
      localStorage.setItem('opm_remembered_email', 'saved@example.com');

      render(<LoginPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/電子郵件/i) as HTMLInputElement;
        const passwordInput = screen.getByLabelText(/密碼/i) as HTMLInputElement;
        const rememberMeCheckbox = screen.getByLabelText(/記住我/i) as HTMLInputElement;

        // Email should be pre-filled
        expect(emailInput.value).toBe('saved@example.com');
        // Password should be empty (security: never stored)
        expect(passwordInput.value).toBe('');
        // Remember me should be checked
        expect(rememberMeCheckbox.checked).toBe(true);
      });
    });

    test('頁面載入時應該清除任何舊的密碼儲存（安全清理）', async () => {
      // Simulate legacy insecure storage
      localStorage.setItem('rememberedEmail', 'legacy@example.com');
      localStorage.setItem('rememberedPassword', 'INSECURE_PASSWORD');
      localStorage.setItem('opm_remembered_password', 'INSECURE_PASSWORD');

      render(<LoginPage />);

      await waitFor(() => {
        // Legacy password storage should be cleaned up
        expect(localStorage.getItem('rememberedPassword')).toBeNull();
        expect(localStorage.getItem('opm_remembered_password')).toBeNull();
      });
    });

    test('登入成功後應該清理所有舊的密碼儲存', async () => {
      (signInWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, userId: 'user-123' });
      (getUserRoles as jest.Mock).mockResolvedValue({ success: true, roles: ['landlord'] });
      (syncUserRolesToAuthMetadata as jest.Mock).mockResolvedValue({ success: true });

      // Set up legacy insecure data
      localStorage.setItem('rememberedPassword', 'OLD_INSECURE_PASSWORD');
      localStorage.setItem('opm_remembered_password', 'OLD_INSECURE_PASSWORD');

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /^登入$/ });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        // Email stored securely
        expect(localStorage.getItem('opm_remembered_email')).toBe('test@example.com');
        // All password storage cleaned up
        expect(localStorage.getItem('rememberedPassword')).toBeNull();
        expect(localStorage.getItem('opm_remembered_password')).toBeNull();
      });
    });
  });

  describe('OAuth 錯誤處理測試', () => {
    test('應該從 URL 參數顯示 OAuth 錯誤訊息', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'access_denied';
        return null;
      });

      render(<LoginPage />);

      expect(screen.getByText(/access_denied/i)).toBeInTheDocument();
    });

    test('應該顯示自訂錯誤訊息（message 參數）', () => {
      const customMessage = 'User cancelled the login process';
      mockGet.mockImplementation((param: string) => {
        if (param === 'message') return customMessage;
        return null;
      });

      render(<LoginPage />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    test('應該顯示 OTP 過期錯誤並提供重設密碼連結', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'otp_expired';
        return null;
      });

      render(<LoginPage />);

      expect(screen.getByText(/重設密碼連結已過期/i)).toBeInTheDocument();
      expect(screen.getByText(/重新申請重設密碼/i)).toBeInTheDocument();
    });

    test('應該顯示 OAuth callback 失敗錯誤', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'auth_callback_failed';
        return null;
      });

      render(<LoginPage />);

      expect(screen.getByText(/auth_callback_failed/i)).toBeInTheDocument();
    });

    test('應該顯示 profile 建立失敗錯誤', () => {
      const errorMessage = 'Database constraint violation';
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'create_profile_failed';
        if (param === 'message') return errorMessage;
        return null;
      });

      render(<LoginPage />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('OAuth 按鈕可見性測試', () => {
    test('應該顯示 Google 和 Facebook 登入按鈕', () => {
      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      const facebookButton = screen.getByRole('button', { name: /Facebook/i });

      expect(googleButton).toBeInTheDocument();
      expect(facebookButton).toBeInTheDocument();
    });

    test('應該顯示 OAuth 分隔線', () => {
      render(<LoginPage />);

      expect(screen.getByText(/或使用社群帳號登入/i)).toBeInTheDocument();
    });

    test('OAuth 按鈕應該在密碼登入模式下可見', () => {
      mockGet.mockReturnValue(null); // Not in invite mode

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      const facebookButton = screen.getByRole('button', { name: /Facebook/i });

      expect(googleButton).toBeVisible();
      expect(facebookButton).toBeVisible();
    });

    test('OAuth 按鈕應該在邀請碼模式下不可見', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'mode') return 'invite';
        return null;
      });

      render(<LoginPage />);

      const googleButton = screen.queryByRole('button', { name: /Google/i });
      const facebookButton = screen.queryByRole('button', { name: /Facebook/i });

      expect(googleButton).not.toBeInTheDocument();
      expect(facebookButton).not.toBeInTheDocument();
    });
  });
});
