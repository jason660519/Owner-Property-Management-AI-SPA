
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUser } from './actions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Mock dependencies
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('inviteUser', () => {
  let mockSupabase: any;
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    };

    mockSupabaseAdmin = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(),
          listUsers: vi.fn(() => Promise.resolve({ data: { users: [] } })),
        },
      },
      from: vi.fn(() => ({
        insert: vi.fn(),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null })),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
    (createAdminClient as any).mockReturnValue(mockSupabaseAdmin);
  });

  it('should allow invite if user has super_admin role in profile', async () => {
    // Setup
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', app_metadata: {}, user_metadata: {} } },
    });
    
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'super_admin' } }),
        }),
      }),
    }));

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    // Execute
    const result = await inviteUser(formData);

    // Assert
    expect(result).toEqual({ success: true });
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should allow invite if user has super_admin role in app_metadata', async () => {
    // Setup
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'test-user-id', 
          app_metadata: { roles: ['super_admin'] }, 
          user_metadata: {} 
        } 
      },
    });
    
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }), // No profile
        }),
      }),
    }));

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    // Execute
    const result = await inviteUser(formData);

    // Assert
    expect(result).toEqual({ success: true });
  });

  it('should reject invite if user has no super_admin role', async () => {
    // Setup
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'test-user-id', 
          app_metadata: { roles: ['landlord'] }, 
          user_metadata: {} 
        } 
      },
    });
    
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'landlord' } }),
        }),
      }),
    }));

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    // Execute
    const result = await inviteUser(formData);

    // Assert
    expect(result).toEqual({ error: 'Unauthorized: Admin access required' });
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('should allow adding an existing user to a new group', async () => {
    // Setup - User is super_admin
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] } } },
    });
    
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
    }));

    // Setup - Existing user
    const existingUserId = 'existing-user-id';
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: existingUserId, email: 'test@example.com' }] },
    });

    // Setup - User NOT in group yet
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null }), // Not in group
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('groupId', 'group-id-123');

    // Execute
    const result = await inviteUser(formData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.warning).toContain('User already exists');
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('iam_group_members');
    // Check that we didn't call inviteUserByEmail
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('should prevent adding existing user to same group', async () => {
    // Setup - User is super_admin
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] } } },
    });
    
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
    }));

    // Setup - Existing user
    const existingUserId = 'existing-user-id';
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: existingUserId, email: 'test@example.com' }] },
    });

    // Setup - User IS already in group
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'membership-id' } }), // Already in group
          }),
        }),
      }),
    }));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('groupId', 'group-id-123');

    // Execute
    const result = await inviteUser(formData);

    // Assert
    expect(result.error).toContain('User already exists and is already a member');
  });
});
