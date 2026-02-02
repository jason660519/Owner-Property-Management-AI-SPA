import { signUp, checkUserExists, addRoleToUser } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset supabase.from mock to default
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    });
  });

  describe('checkUserExists', () => {
    test('應該返回true當用戶存在時', async () => {
      const mockUsers = [
        { email: 'existing@example.com' },
        { email: 'other@example.com' }
      ];
      
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: { users: mockUsers },
        error: null
      });

      const result = await checkUserExists('existing@example.com');
      expect(result).toBe(true);
      expect(supabase.auth.admin.listUsers).toHaveBeenCalled();
    });

    test('應該返回false當用戶不存在時', async () => {
      const mockUsers = [
        { email: 'other@example.com' }
      ];
      
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: { users: mockUsers },
        error: null
      });

      const result = await checkUserExists('nonexistent@example.com');
      expect(result).toBe(false);
    });

    test('應該拋出錯誤當API失敗時', async () => {
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('API Error')
      });

      await expect(checkUserExists('test@example.com')).rejects.toThrow('API Error');
    });
  });

  describe('addRoleToUser', () => {
    test('應該成功添加角色到用戶', async () => {
      const mockUser = {
        id: 'user-123',
        user_metadata: { roles: ['landlord'] }
      };
      
      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      (supabase.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        error: null
      });
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      });

      await expect(addRoleToUser('user-123', 'tenant')).resolves.toBeUndefined();
      
      expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        user_metadata: { roles: ['landlord', 'tenant'] }
      });
    });

    test('應該處理角色已存在的情況', async () => {
      const mockUser = {
        id: 'user-123',
        user_metadata: { roles: ['landlord', 'tenant'] }
      };
      
      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await addRoleToUser('user-123', 'tenant');
      
      expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        user_metadata: { roles: ['landlord', 'tenant'] } // 應該保持不變
      });
    });
  });

  describe('signUp', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'ValidPass123',
      full_name: 'Test User',
      role: 'landlord' as const
    };

    test('應該創建新用戶當用戶不存在時', async () => {
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: { users: [] },
        error: null
      });
      
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'new-user-123' } },
        error: null
      });
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis()
      });

      await signUp(credentials);
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123',
        options: {
          data: {
            full_name: 'Test User',
            roles: ['landlord'],
            primary_role: 'landlord'
          }
        }
      });
    });

    test('應該添加角色到現有用戶', async () => {
      const mockUsers = [
        { id: 'existing-user-123', email: 'test@example.com' }
      ];
      
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: { users: mockUsers },
        error: null
      });
      
      (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { user_metadata: { roles: ['tenant'] } } },
        error: null
      });
      
      (supabase.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        error: null
      });

      await signUp({ ...credentials, role: 'landlord' });
      
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
      expect(supabase.auth.admin.updateUserById).toHaveBeenCalled();
    });

    test('應該處理註冊錯誤', async () => {
      (supabase.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: { users: [] },
        error: null
      });
      
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('Registration failed')
      });

      await expect(signUp(credentials)).rejects.toThrow('Registration failed');
    });
  });
});