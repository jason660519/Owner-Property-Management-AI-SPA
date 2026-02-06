import {
  signUpSchema,
  passwordSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validators/auth';

describe('Auth Validators', () => {
  describe('passwordSchema', () => {
    test('應該拒絕少於8個字符的密碼', () => {
      const result = passwordSchema.safeParse('Short1');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼至少需要 8 個字元');
    });

    test('應該拒絕沒有大寫字母的密碼', () => {
      const result = passwordSchema.safeParse('lowercase123');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼必須包含至少一個大寫字母');
    });

    test('應該拒絕沒有小寫字母的密碼', () => {
      const result = passwordSchema.safeParse('UPPERCASE123');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼必須包含至少一個小寫字母');
    });

    test('應該拒絕沒有數字的密碼', () => {
      const result = passwordSchema.safeParse('NoNumbersHere');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼必須包含至少一個數字');
    });

    test('應該接受有效的密碼', () => {
      const result = passwordSchema.safeParse('ValidPass123');
      expect(result.success).toBe(true);
    });
  });

  describe('signUpSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'ValidPass123',
      confirmPassword: 'ValidPass123',
      fullName: 'Test User',
      role: 'landlord' as const,
      agreeToTerms: true,
    };

    test('應該接受有效的註冊數據', () => {
      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('應該拒絕無效的email', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('請輸入有效的 Email 地址');
    });

    test('應該拒絕密碼不匹配', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPass123',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼不一致');
    });

    test('應該拒絕未同意條款', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        agreeToTerms: false,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('請同意服務條款');
    });

    test('應該拒絕姓名太短', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        fullName: 'A',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('姓名至少需要 2 個字元');
    });

    test('應該拒絕無效的角色', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        role: 'invalid_role' as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'AnyPassword',
      rememberMe: true,
    };

    test('應該接受有效的登入數據', () => {
      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('應該拒絕無效的email', () => {
      const result = signInSchema.safeParse({
        ...validData,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('請輸入有效的 Email 地址');
    });

    test('應該拒絕空密碼', () => {
      const result = signInSchema.safeParse({
        ...validData,
        password: '',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('請輸入密碼');
    });
  });

  describe('forgotPasswordSchema', () => {
    test('應該接受有效的Email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
    });

    test('應該拒絕無效的Email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('請輸入有效的 Email 地址');
    });
  });

  describe('resetPasswordSchema', () => {
    const validData = {
      password: 'ValidPass123',
      confirmPassword: 'ValidPass123',
    };

    test('應該接受有效的重設密碼數據', () => {
      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('應該拒絕密碼不一致', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPass123',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼不一致');
    });

    test('應該拒絕弱密碼', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'short1',
        confirmPassword: 'short1',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('密碼至少需要 8 個字元');
    });
  });
});
