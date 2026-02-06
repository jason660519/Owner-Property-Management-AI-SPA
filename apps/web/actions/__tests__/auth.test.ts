import { signUpWithRole } from '@/app/actions/auth';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
    from: jest.fn(),
  })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';

describe('signUpWithRole Server Action', () => {
  let mockAdminSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminSupabase = (createClient as jest.Mock)();
  });

  describe('New User Registration', () => {
    it('should successfully create new user with profile', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockAdminSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            email: 'newuser@example.com',
          },
        },
        error: null,
      });

      mockAdminSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: null,
        }),
      });

      const result = await signUpWithRole({
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New User',
        role: 'landlord',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('註冊成功');
    });

    it('should use default role "landlord" if not specified', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockAdminSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            email: 'newuser@example.com',
          },
        },
        error: null,
      });

      mockAdminSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: null,
        }),
      });

      const result = await signUpWithRole({
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New User',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Existing User with Same Role', () => {
    it('should return success message if user already exists with same role', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'existing-user-id',
              email: 'existing@example.com',
              user_metadata: {
                roles: ['landlord'],
              },
            },
          ],
        },
        error: null,
      });

      const result = await signUpWithRole({
        email: 'existing@example.com',
        password: 'password123',
        role: 'landlord',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('帳號已存在');
    });
  });

  describe('Existing User with Different Role', () => {
    it('should add new role to existing user', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        user_metadata: {
          role: 'landlord',
          display_name: 'Existing User',
        },
      };

      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [existingUser],
        },
        error: null,
      });

      mockAdminSupabase.auth.admin.updateUserById.mockResolvedValue({
        data: { user: existingUser },
        error: null,
      });

      mockAdminSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            error: null,
          }),
        }),
      });

      const result = await signUpWithRole({
        email: 'existing@example.com',
        password: 'password123',
        role: 'tenant',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('角色已新增');
    });
  });

  describe('Error Handling', () => {
    it('should handle list users error', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await signUpWithRole({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('系統錯誤，請稍後再試');
    });

    it('should handle create user error', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockAdminSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      const result = await signUpWithRole({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });

    it('should handle profile creation error gracefully', async () => {
      mockAdminSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockAdminSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            email: 'newuser@example.com',
          },
        },
        error: null,
      });

      mockAdminSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: { message: 'Profile creation failed' },
        }),
      });

      const result = await signUpWithRole({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('註冊成功');
    });
  });
});
