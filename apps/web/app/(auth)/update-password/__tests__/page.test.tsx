import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePasswordPage from '@/app/(auth)/update-password/page';
import { updatePassword } from '@/lib/supabase/auth';

// Mock auth functions
jest.mock('@/lib/supabase/auth', () => ({
  updatePassword: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('UpdatePasswordPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('應該正確渲染表單', () => {
    render(<UpdatePasswordPage />);
    
    expect(screen.getByText('設定新密碼')).toBeInTheDocument();
    expect(screen.getByLabelText(/^新密碼/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/確認新密碼/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新密碼/i })).toBeInTheDocument();
  });

  test('應該顯示驗證錯誤', async () => {
    render(<UpdatePasswordPage />);
    
    await user.click(screen.getByRole('button', { name: /更新密碼/i }));
    
    expect(await screen.findByText(/密碼至少需要 8 個字元/i)).toBeInTheDocument();
  });

  test('應該顯示密碼不一致錯誤', async () => {
    render(<UpdatePasswordPage />);
    
    await user.type(screen.getByLabelText(/^新密碼/i), 'ValidPass123');
    await user.type(screen.getByLabelText(/確認新密碼/i), 'DifferentPass123');
    await user.click(screen.getByRole('button', { name: /更新密碼/i }));

    expect(await screen.findByText(/密碼不一致/i)).toBeInTheDocument();
  });

  test('應該成功更新密碼', async () => {
    (updatePassword as jest.Mock).mockResolvedValue({ error: null });

    render(<UpdatePasswordPage />);
    
    await user.type(screen.getByLabelText(/^新密碼/i), 'ValidPass123');
    await user.type(screen.getByLabelText(/確認新密碼/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /更新密碼/i }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith('ValidPass123');
      expect(screen.getByText(/密碼更新成功/i)).toBeInTheDocument();
    });

    // Check redirection after timeout
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  test('應該處理更新失敗', async () => {
    const errorMessage = '更新密碼失敗';
    (updatePassword as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<UpdatePasswordPage />);
    
    await user.type(screen.getByLabelText(/^新密碼/i), 'ValidPass123');
    await user.type(screen.getByLabelText(/確認新密碼/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /更新密碼/i }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
