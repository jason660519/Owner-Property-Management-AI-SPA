import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import { signInWithPassword, signInWithGoogle, signInWithFacebook } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';

// Mock the auth functions
jest.mock('@/lib/supabase/auth', () => ({
  signInWithPassword: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithFacebook: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('LoginPage', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
    // Mock global fetch for API calls
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ redirectUrl: '/landlord/dashboard' }),
      })
    ) as jest.Mock;
  });

  test('應該正確渲染登入表單', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/電子郵件/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密碼/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/記住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument();
    expect(screen.getByText(/忘記密碼/i)).toBeInTheDocument();
  });

  test('應該顯示表單驗證錯誤', async () => {
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /登入/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/請輸入有效的電子郵件地址/i)).toBeInTheDocument();
    expect(screen.getByText(/密碼至少需要 8 個字元/i)).toBeInTheDocument();
  });

  test('應該成功登入並重定向 (房東)', async () => {
    const mockUser = { id: 'user-123', email: 'landlord@example.com' };
    (signInWithPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
      session: { user: mockUser },
    });

    // Mock supabase profile query
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { primary_role: 'landlord' },
            error: null,
          }),
        }),
      }),
    });

    render(<LoginPage />);
    
    await user.type(screen.getByLabelText(/電子郵件/i), 'landlord@example.com');
    await user.type(screen.getByLabelText(/密碼/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /登入/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'landlord@example.com',
        password: 'ValidPass123',
      });
      // Check if fetch was called for token generation
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/generate-transfer-token', expect.any(Object));
    });
  });

  test('應該成功登入並重定向 (租客)', async () => {
    const mockUser = { id: 'user-456', email: 'tenant@example.com' };
    (signInWithPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
      session: { user: mockUser },
    });

    // Mock supabase profile query
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { primary_role: 'tenant' },
            error: null,
          }),
        }),
      }),
    });

    render(<LoginPage />);
    
    await user.type(screen.getByLabelText(/電子郵件/i), 'tenant@example.com');
    await user.type(screen.getByLabelText(/密碼/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /登入/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tenant/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  test('應該處理登入失敗', async () => {
    const errorMessage = 'Invalid credentials';
    (signInWithPassword as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<LoginPage />);
    
    await user.type(screen.getByLabelText(/電子郵件/i), 'test@example.com');
    await user.type(screen.getByLabelText(/密碼/i), 'WrongPass123');
    await user.click(screen.getByRole('button', { name: /登入/i }));
    
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('應該處理 Google 登入', async () => {
    render(<LoginPage />);
    
    const googleButton = screen.getAllByRole('button')[1]; // Assume second button is Google
    await user.click(googleButton);
    
    expect(signInWithGoogle).toHaveBeenCalled();
  });

  test('應該處理 Facebook 登入', async () => {
    render(<LoginPage />);
    
    const facebookButton = screen.getAllByRole('button')[2]; // Assume third button is Facebook
    await user.click(facebookButton);
    
    expect(signInWithFacebook).toHaveBeenCalled();
  });

  describe('記住我功能測試 (安全版本 - 僅儲存 Email)', () => {
    /**
     * Security: Password is NEVER stored in localStorage
     * Only email is stored for form pre-fill convenience
     * Session persistence is handled by Supabase's token management
     */

    test('勾選「記住我」後應該只儲存 email（不儲存密碼以確保安全）', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (signInWithPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { primary_role: 'landlord' },
              error: null,
            }),
          }),
        }),
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

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
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (signInWithPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { primary_role: 'landlord' },
              error: null,
            }),
          }),
        }),
      });

      // Set up previously saved data
      localStorage.setItem('opm_remembered_email', 'old@example.com');

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

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
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (signInWithPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { primary_role: 'landlord' },
              error: null,
            }),
          }),
        }),
      });

      // Set up legacy insecure data
      localStorage.setItem('rememberedPassword', 'OLD_INSECURE_PASSWORD');
      localStorage.setItem('opm_remembered_password', 'OLD_INSECURE_PASSWORD');

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/電子郵件/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

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
});
