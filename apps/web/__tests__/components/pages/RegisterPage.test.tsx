import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import RegisterPage from '@/app/(auth)/register/page';
import * as authActions from '@/app/actions/auth';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/app/actions/auth');

describe('RegisterPage', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render register form with all elements', () => {
    render(<RegisterPage />);

    expect(screen.getByText('建立您的帳號')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
    expect(screen.getByLabelText('密碼')).toBeInTheDocument();
    expect(screen.getByLabelText('確認密碼')).toBeInTheDocument();
    expect(screen.getByText('帳號類型')).toBeInTheDocument();
    expect(screen.getByText('房東')).toBeInTheDocument();
    expect(screen.getByText('租客')).toBeInTheDocument();
    expect(screen.getByText('買家')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /註冊/i })).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText('密碼') as HTMLInputElement;
    const toggleButtons = screen.getAllByLabelText('toggle password visibility');

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButtons[0]);
    expect(passwordInput.type).toBe('text');
  });

  it('should show validation errors for invalid inputs', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    const submitButton = screen.getByRole('button', { name: /註冊/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('姓名至少需要 2 個字元')).toBeInTheDocument();
      expect(screen.getByText('請輸入有效的電子郵件地址')).toBeInTheDocument();
    });
  });

  it('should show password strength indicator', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText('密碼');

    await user.type(passwordInput, 'Test1234');

    await waitFor(() => {
      expect(screen.getByText(/密碼強度/)).toBeInTheDocument();
    });
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText('密碼');
    const confirmPasswordInput = screen.getByLabelText('確認密碼');
    const submitButton = screen.getByRole('button', { name: /註冊/i });

    await user.type(passwordInput, 'Test1234');
    await user.type(confirmPasswordInput, 'Test5678');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('密碼不一致')).toBeInTheDocument();
    });
  });

  it('should successfully register and redirect to login after 3 seconds', async () => {
    const user = userEvent.setup({ delay: null });

    (authActions.signUpWithRole as jest.Mock).mockResolvedValue({
      success: true,
      message: '註冊成功',
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('姓名');
    const emailInput = screen.getByLabelText('電子郵件');
    const passwordInput = screen.getByLabelText('密碼');
    const confirmPasswordInput = screen.getByLabelText('確認密碼');
    const termsCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /註冊/i });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Test1234');
    await user.type(confirmPasswordInput, 'Test1234');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('註冊成功！')).toBeInTheDocument();
      expect(screen.getByText(/3 秒後將跳轉到登入頁面/)).toBeInTheDocument();
    });

    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should handle registration error', async () => {
    const user = userEvent.setup({ delay: null });

    (authActions.signUpWithRole as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Email already exists',
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('姓名');
    const emailInput = screen.getByLabelText('電子郵件');
    const passwordInput = screen.getByLabelText('密碼');
    const confirmPasswordInput = screen.getByLabelText('確認密碼');
    const termsCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /註冊/i });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Test1234');
    await user.type(confirmPasswordInput, 'Test1234');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('should require terms agreement', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('姓名');
    const emailInput = screen.getByLabelText('電子郵件');
    const passwordInput = screen.getByLabelText('密碼');
    const confirmPasswordInput = screen.getByLabelText('確認密碼');
    const submitButton = screen.getByRole('button', { name: /註冊/i });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Test1234');
    await user.type(confirmPasswordInput, 'Test1234');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('您必須同意服務條款')).toBeInTheDocument();
    });
  });
});
