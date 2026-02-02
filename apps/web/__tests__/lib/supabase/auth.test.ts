import { signInWithPassword, resetPassword, updatePassword, signOut } from '@/lib/supabase/auth';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase/client';

describe('Authentication Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithPassword', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
    });

    it('should throw error for invalid credentials', async () => {
      const mockError = new Error('Invalid login credentials');

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        signInWithPassword({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should throw error for empty email', async () => {
      const mockError = new Error('Email is required');

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        signInWithPassword({
          email: '',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it('should throw error for empty password', async () => {
      const mockError = new Error('Password is required');

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        signInWithPassword({
          email: 'test@example.com',
          password: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email with correct redirectTo', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      await resetPassword('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: expect.stringContaining('/auth/callback?next=/update-password'),
      });
    });

    it('should throw error for invalid email', async () => {
      const mockError = new Error('Invalid email');

      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: mockError,
      });

      await expect(resetPassword('invalid-email')).rejects.toThrow('Invalid email');
    });

    it('should throw error for empty email', async () => {
      const mockError = new Error('Email is required');

      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: mockError,
      });

      await expect(resetPassword('')).rejects.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await updatePassword('newPassword123');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });

      expect(result.user).toEqual(mockUser);
    });

    it('should throw error for weak password', async () => {
      const mockError = new Error('Password should be at least 6 characters');

      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      await expect(updatePassword('123')).rejects.toThrow(
        'Password should be at least 6 characters'
      );
    });

    it('should throw error for empty password', async () => {
      const mockError = new Error('Password is required');

      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      await expect(updatePassword('')).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await expect(signOut()).resolves.not.toThrow();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error if sign out fails', async () => {
      const mockError = new Error('Failed to sign out');

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      await expect(signOut()).rejects.toThrow('Failed to sign out');
    });
  });
});
