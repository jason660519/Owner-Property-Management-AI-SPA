import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/(auth)/register/page';
import { signUpWithRole } from '@/app/actions/auth';

// Mock the signUpWithRole function
jest.mock('@/app/actions/auth', () => ({
  signUpWithRole: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('RegisterPage', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('應該正確渲染註冊表單', () => {
    render(<RegisterPage />);
    
    expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
    expect(screen.getByLabelText('密碼')).toBeInTheDocument();
    expect(screen.getByLabelText('確認密碼')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByText(/帳號類型/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /註冊/i })).toBeInTheDocument();
  });

  test('應該顯示表單驗證錯誤', async () => {
    render(<RegisterPage />);
    
    const submitButton = screen.getByRole('button', { name: /註冊/i });
    
    await user.click(submitButton);
    
    expect(await screen.findByText(/請輸入有效的電子郵件地址/i)).toBeInTheDocument();
    expect(screen.getByText(/姓名至少需要 2 個字元/i)).toBeInTheDocument();
    expect(screen.getByText(/您必須同意服務條款/i)).toBeInTheDocument();
  });

  test('應該成功提交有效的表單', async () => {
    (signUpWithRole as jest.Mock).mockResolvedValue({ success: true });
    
    render(<RegisterPage />);
    
    await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
    await user.type(screen.getByLabelText('密碼'), 'ValidPass123');
    await user.type(screen.getByLabelText('確認密碼'), 'ValidPass123');
    await user.type(screen.getByLabelText('姓名'), 'Test User');
    
    await user.click(screen.getByLabelText('房東'));
    
    const agreeCheckbox = screen.getByRole('checkbox');
    await user.click(agreeCheckbox);
    
    const submitButton = screen.getByRole('button', { name: /註冊/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(signUpWithRole).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123',
        full_name: 'Test User',
        role: 'landlord',
      });
    });
  });

  test('應該處理註冊失敗', async () => {
    const errorMessage = '註冊失敗，請稍後再試';
    (signUpWithRole as jest.Mock).mockResolvedValue({ success: false, error: errorMessage });
    
    render(<RegisterPage />);
    
    // 填寫表單
    await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
    await user.type(screen.getByLabelText('密碼'), 'ValidPass123');
    await user.type(screen.getByLabelText('確認密碼'), 'ValidPass123');
    await user.type(screen.getByLabelText('姓名'), 'Test User');
    await user.click(screen.getByLabelText('房東'));
    await user.click(screen.getByRole('checkbox'));
    
    await user.click(screen.getByRole('button', { name: /註冊/i }));
    
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('應該顯示密碼強度驗證錯誤', async () => {
    render(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText('密碼');
    
    // 測試沒有大寫字母
    await user.type(passwordInput, 'lowercase123');
    expect(screen.getByText(/必須包含至少一個大寫字母/i)).toBeInTheDocument();
    
    // 測試沒有小寫字母
    await user.clear(passwordInput);
    await user.type(passwordInput, 'UPPERCASE123');
    expect(screen.getByText(/必須包含至少一個小寫字母/i)).toBeInTheDocument();
    
    // 測試沒有數字
    await user.clear(passwordInput);
    await user.type(passwordInput, 'NoNumbersHere');
    expect(screen.getByText(/必須包含至少一個數字/i)).toBeInTheDocument();
    
    // 測試長度不足
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Short1');
    expect(screen.getByText(/至少需要 8 個字元/i)).toBeInTheDocument();
  });

  test('應該顯示密碼不匹配錯誤', async () => {
    render(<RegisterPage />);
    
    await user.type(screen.getByLabelText('密碼'), 'ValidPass123');
    await user.type(screen.getByLabelText('確認密碼'), 'DifferentPass123');
    
    const submitButton = screen.getByRole('button', { name: /註冊/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/密碼不一致/i)).toBeInTheDocument();
  });
});
