import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '@/app/(auth)/login/page';
import * as auth from '@/lib/supabase/auth';
import * as supabaseClient from '@/lib/supabase/client';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabase/auth');
jest.mock('@/lib/supabase/client');

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockSupabaseFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });

    (supabaseClient.createClient as jest.Mock).mockReturnValue({
      from: mockSupabaseFrom,
    });
  });

  it('should render login form with all elements', () => {
    const { container } = render(<LoginPage />);

    expect(screen.getByText('歡迎回來')).toBeInTheDocument();
    expect(screen.getByText('登入您的 RESA AI 帳號')).toBeInTheDocument();
    expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
    expect(screen.getByLabelText('密碼')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument();
    expect(screen.getByText('忘記密碼？')).toBeInTheDocument();
    expect(screen.getByText(/還沒有帳號？/)).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('密碼') as HTMLInputElement;
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find((btn) => btn.querySelector('svg'));

    expect(passwordInput.type).toBe('password');

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    }
  });

  it('should show validation errors for invalid inputs', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /登入/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('請輸入有效的電子郵件地址')).toBeInTheDocument();
      expect(screen.getByText('密碼至少需要 8 個字元')).toBeInTheDocument();
    });
  });

  it('should successfully login and redirect to landlord dashboard', async () => {
    const user = userEvent.setup();

    (auth.signInWithPassword as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      session: { access_token: 'token' },
    });

    mockSupabaseFrom.mockReturnValue({
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

    const emailInput = screen.getByLabelText('電子郵件');
    const passwordInput = screen.getByLabelText('密碼');
    const submitButton = screen.getByRole('button', { name: /登入/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/landlord/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();

    (auth.signInWithPassword as jest.Mock).mockRejectedValue(
      new Error('Invalid login credentials')
    );

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('電子郵件');
    const passwordInput = screen.getByLabelText('密碼');
    const submitButton = screen.getByRole('button', { name: /登入/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpass123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });
});
