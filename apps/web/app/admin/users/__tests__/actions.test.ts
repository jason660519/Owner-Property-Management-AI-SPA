import { inviteUser } from '@/app/admin/users/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Admin User Actions', () => {
  const mockSupabaseAdmin = {
    auth: {
      admin: {
        inviteUserByEmail: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
    })),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
  };

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabaseAdmin);
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    
    // Default authorized mock
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } } });
    mockQueryBuilder.single.mockResolvedValue({ data: { primary_role: 'super_admin' } });
  });

  describe('inviteUser', () => {
    test('應該成功邀請用戶並添加到群組', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('groupId', 'group-123');

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert });

      const result = await inviteUser(formData);

      expect(result).toEqual({ success: true });
      expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('iam_group_members');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        group_id: 'group-123',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
    });

    test('應該處理邀請失敗', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');

      mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invite failed' },
      });

      const result = await inviteUser(formData);

      expect(result).toEqual({ error: 'Invite failed' });
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test('應該拒絕非管理員的邀請', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      
      // Mock unauthorized user
      mockQueryBuilder.single.mockResolvedValue({ data: { primary_role: 'tenant' } });
      
      const result = await inviteUser(formData);
      expect(result).toEqual({ error: 'Unauthorized: Admin access required' });
      expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    test('應該處理缺少 Email', async () => {
      const formData = new FormData();
      // No email

      const result = await inviteUser(formData);

      expect(result).toEqual({ error: 'Email is required' });
      expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    test('應該警告當群組添加失敗', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('groupId', 'group-123');

      const mockUser = { id: 'user-123' };
      mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'Group error' } });
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert });

      const result = await inviteUser(formData);

      expect(result).toEqual({ success: true, warning: 'User invited but failed to add to group: Group error' });
    });
  });
});
