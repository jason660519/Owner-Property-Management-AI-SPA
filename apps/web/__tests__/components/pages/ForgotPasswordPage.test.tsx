import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';
import * as auth from '@/lib/supabase/auth';

jest.mock('@/lib/supabase/auth');

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render forgot password form', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText('忘記密碼')).toBeInTheDocument();
    expect(screen.getByText(/輸入您的電子郵件地址/)).toBeInTheDocument();
    expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /發送重設連結/i })).toBeInTheDocument();
  });

  it('should show validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const submitButton = screen.getByRole('button', { name: /發送重設連結/i });

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('請輸入有效的電子郵件地址')).toBeInTheDocument();
    });
  });

  it('should successfully send reset password email and show success message', async () => {
    const user = userEvent.setup();
    (auth.resetPassword as jest.Mock).mockResolvedValue({});

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText('電子郵件');
    const submitButton = screen.getByRole('button', { name: /發送重設連結/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(auth.resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText('郵件已發送！')).toBeInTheDocument();
      expect(screen.getByText(/我們已經發送重設密碼的連結到您的電子郵件/)).toBeInTheDocument();
      expect(screen.getByText('返回登入頁面')).toBeInTheDocument();
    });
  });

  it('should handle reset password error', async () => {
    const user = userEvent.setup();
    (auth.resetPassword as jest.Mock).mockRejectedValue(new Error('User not found'));

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText('電子郵件');
    const submitButton = screen.getByRole('button', { name: /發送重設連結/i });

    await user.type(emailInput, 'nonexistent@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('should have link back to login', () => {
    render(<ForgotPasswordPage />);

    const loginLink = screen.getByText('← 返回登入');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should have link to register', () => {
    render(<ForgotPasswordPage />);

    const registerLink = screen.getByText('立即註冊');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
