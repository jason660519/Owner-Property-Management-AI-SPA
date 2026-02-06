import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/app/forgot-password/page';
import { resetPassword } from '@/lib/supabase/auth';

// Mock auth functions
jest.mock('@/lib/supabase/auth', () => ({
  resetPassword: jest.fn(),
}));

describe('ForgotPasswordPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('應該正確渲染表單', () => {
    render(<ForgotPasswordPage />);
    
    expect(screen.getByText('忘記密碼')).toBeInTheDocument();
    expect(screen.getByLabelText(/電子郵件/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /發送重設連結/i })).toBeInTheDocument();
  });

  test('應該顯示驗證錯誤', async () => {
    render(<ForgotPasswordPage />);
    
    const submitButton = screen.getByRole('button', { name: /發送重設連結/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/請輸入有效的 Email 地址/i)).toBeInTheDocument();
  });

  test('應該成功發送重設連結', async () => {
    (resetPassword as jest.Mock).mockResolvedValue({ error: null });

    render(<ForgotPasswordPage />);
    
    await user.type(screen.getByLabelText(/電子郵件/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /發送重設連結/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText(/請檢查您的信箱/i)).toBeInTheDocument();
    });
  });

  test('應該處理發送失敗', async () => {
    const errorMessage = '發送重設連結失敗';
    (resetPassword as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<ForgotPasswordPage />);
    
    await user.type(screen.getByLabelText(/電子郵件/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /發送重設連結/i }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
