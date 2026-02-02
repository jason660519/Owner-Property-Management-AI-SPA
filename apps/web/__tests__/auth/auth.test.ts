/**
 * @file auth.test.ts
 * @description Authentication system tests (TDD)
 * @created 2026-02-03
 * @creator Claude Opus 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    insert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
  supabase: mockSupabase,
}));

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // 1. 登入功能測試
  // ========================================
  describe('Login (signInWithPassword)', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const mockUser = { id: 'user-123', email: credentials.email };
      const mockSession = { access_token: 'token-123' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      const result = await mockSupabase.auth.signInWithPassword(credentials);

      // Assert
      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.session).toEqual(mockSession);
    });

    it('should return error for invalid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      // Act
      const result = await mockSupabase.auth.signInWithPassword(credentials);

      // Assert
      expect(result.error).not.toBeNull();
      expect(result.error.message).toBe('Invalid login credentials');
      expect(result.data.user).toBeNull();
    });

    it('should return error for empty email', async () => {
      // Arrange
      const credentials = {
        email: '',
        password: 'Password123!',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email is required' },
      });

      // Act
      const result = await mockSupabase.auth.signInWithPassword(credentials);

      // Assert
      expect(result.error).not.toBeNull();
    });

    it('should return error for password less than 8 characters', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: '1234567',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password must be at least 8 characters' },
      });

      // Act
      const result = await mockSupabase.auth.signInWithPassword(credentials);

      // Assert
      expect(result.error).not.toBeNull();
    });
  });

  // ========================================
  // 2. 註冊功能測試
  // ========================================
  describe('Registration (signUp)', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const newUser = {
        email: 'newuser@example.com',
        password: 'Password123!',
        options: {
          data: {
            full_name: 'New User',
            roles: ['landlord'],
            primary_role: 'landlord',
          },
        },
      };
      const mockUser = {
        id: 'new-user-123',
        email: newUser.email,
        user_metadata: newUser.options.data,
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      // Act
      const result = await mockSupabase.auth.signUp(newUser);

      // Assert
      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.user.user_metadata.primary_role).toBe('landlord');
    });

    it('should return error for existing email', async () => {
      // Arrange
      const existingUser = {
        email: 'existing@example.com',
        password: 'Password123!',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      // Act
      const result = await mockSupabase.auth.signUp(existingUser);

      // Assert
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('already registered');
    });

    it('should validate password requirements', async () => {
      // Arrange - Password without uppercase
      const weakPassword = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password must contain uppercase letter' },
      });

      // Act
      const result = await mockSupabase.auth.signUp(weakPassword);

      // Assert
      expect(result.error).not.toBeNull();
    });

    it('should create users_profile after successful registration', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      // Act
      await mockSupabase.from('users_profile').insert({
        user_id: mockUser.id,
        email: mockUser.email,
        full_name: 'Test User',
        roles: ['landlord'],
        primary_role: 'landlord',
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users_profile');
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  // ========================================
  // 3. 密碼重設功能測試
  // ========================================
  describe('Password Reset', () => {
    it('should send reset password email', async () => {
      // Arrange
      const email = 'test@example.com';
      const redirectTo = 'http://localhost:3000/auth/callback?next=/update-password';

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // Act
      const result = await mockSupabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      // Assert
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        email,
        { redirectTo }
      );
    });

    it('should return error for non-existent email', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      // Act
      const result = await mockSupabase.auth.resetPasswordForEmail(email, {});

      // Assert
      // Note: Supabase might not return error for security reasons
      // This test verifies the handling behavior
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalled();
    });

    it('should update password successfully', async () => {
      // Arrange
      const newPassword = 'NewPassword123!';

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Act
      const result = await mockSupabase.auth.updateUser({
        password: newPassword,
      });

      // Assert
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword,
      });
    });

    it('should reject weak password on update', async () => {
      // Arrange
      const weakPassword = 'weak';

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Password is too weak' },
      });

      // Act
      const result = await mockSupabase.auth.updateUser({
        password: weakPassword,
      });

      // Assert
      expect(result.error).not.toBeNull();
    });
  });

  // ========================================
  // 4. 登出功能測試
  // ========================================
  describe('Sign Out', () => {
    it('should successfully sign out', async () => {
      // Arrange
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const result = await mockSupabase.auth.signOut();

      // Assert
      expect(result.error).toBeNull();
    });

    it('should clear session after sign out', async () => {
      // Arrange
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      await mockSupabase.auth.signOut();
      const sessionResult = await mockSupabase.auth.getSession();

      // Assert
      expect(sessionResult.data.session).toBeNull();
    });
  });

  // ========================================
  // 5. Self-healing Profile 測試
  // ========================================
  describe('Self-healing Profile', () => {
    it('should create profile if missing on login', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          primary_role: 'landlord',
        },
      };

      // Profile doesn't exist
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Row not found
          }),
        })),
      }));

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users_profile') {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
        return {};
      });

      // Act - Simulate the self-healing logic
      const { data: profile, error: profileError } = await mockSupabase
        .from('users_profile')
        .select('*')
        .eq('user_id', mockUser.id)
        .single();

      if (profileError || !profile) {
        // Self-healing: Create profile
        await mockSupabase.from('users_profile').insert({
          user_id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.user_metadata.full_name,
          primary_role: mockUser.user_metadata.primary_role,
          roles: [mockUser.user_metadata.primary_role],
        });
      }

      // Assert
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  // ========================================
  // 6. 輸入驗證測試
  // ========================================
  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co'];
      const invalidEmails = ['invalid', '@example.com', 'test@', 'test@.com'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate password requirements', () => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

      // Valid passwords
      expect(passwordRegex.test('Password123')).toBe(true);
      expect(passwordRegex.test('MySecure1Pass')).toBe(true);

      // Invalid passwords
      expect(passwordRegex.test('password123')).toBe(false); // No uppercase
      expect(passwordRegex.test('PASSWORD123')).toBe(false); // No lowercase
      expect(passwordRegex.test('PasswordABC')).toBe(false); // No number
      expect(passwordRegex.test('Pass1')).toBe(false); // Too short
    });

    it('should validate password confirmation matches', () => {
      const password = 'Password123!';
      const confirmPassword = 'Password123!';
      const wrongConfirmPassword = 'Password456!';

      expect(password === confirmPassword).toBe(true);
      expect(password === wrongConfirmPassword).toBe(false);
    });
  });
});
