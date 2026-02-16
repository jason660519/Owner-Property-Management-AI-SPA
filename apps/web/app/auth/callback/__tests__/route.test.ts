/**
 * @file route.test.ts
 * @description Unit tests for OAuth callback route handler
 * @created 2026-02-16
 * @creator Claude Sonnet 4.5
 * @version 1.0
 * @jest-environment node
 */

import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { addUserToIamGroupByRole } from '@/lib/iam';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/utils/supabase/admin');
jest.mock('@/lib/iam');
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url: string) => ({ url, status: 302 })),
  },
}));

describe('OAuth Callback Route Handler', () => {
  const mockOrigin = 'http://localhost:3000';
  let mockSupabase: any;
  let mockAdminClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        exchangeCodeForSession: jest.fn(),
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        insert: jest.fn(),
      })),
    };

    mockAdminClient = {};

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
  });

  describe('Error Handling', () => {
    test('should redirect to login with error when error parameter is present', async () => {
      const request = new Request(
        `${mockOrigin}/auth/callback?error=access_denied&error_description=User%20cancelled`
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=')
      );
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('User%20cancelled')
      );
    });

    test('should redirect to login when code is missing', async () => {
      const request = new Request(`${mockOrigin}/auth/callback`);

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=auth_callback_failed')
      );
    });

    test('should redirect to login when code exchange fails', async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        error: new Error('Invalid code'),
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=invalid_code`);

      await GET(request);

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('invalid_code');
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=auth_callback_failed')
      );
    });
  });

  describe('Recovery Flow', () => {
    test('should redirect to update-password for recovery type', async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        `${mockOrigin}/auth/callback?code=valid_code&type=recovery`
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/update-password`
      );
    });
  });

  describe('Invite Flow', () => {
    test('should redirect to login in invite mode for invite type', async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });

      const request = new Request(
        `${mockOrigin}/auth/callback?code=valid_code&type=invite`
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/login?mode=invite`
      );
    });
  });

  describe('Existing User Login', () => {
    test('should redirect single-role user to role dashboard', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'landlord@example.com',
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockProfile = {
        roles: ['landlord'],
        primary_role: 'landlord',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid_code');
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('users_profile');
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/landlord/dashboard`
      );
    });

    test('should redirect multi-role user to portal', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'multi@example.com',
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockProfile = {
        roles: ['landlord', 'tenant'],
        primary_role: 'landlord',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(`${mockOrigin}/portal`);
    });

    test('should redirect super_admin to portal', async () => {
      const mockUser = {
        id: 'admin-789',
        email: 'admin@example.com',
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockProfile = {
        roles: ['super_admin'],
        primary_role: 'super_admin',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(`${mockOrigin}/portal`);
    });

    test('should respect next parameter for custom redirect', async () => {
      const mockUser = {
        id: 'user-next',
        email: 'user@example.com',
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockProfile = {
        roles: ['landlord'],
        primary_role: 'landlord',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new Request(
        `${mockOrigin}/auth/callback?code=valid_code&next=/custom/path`
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(`${mockOrigin}/custom/path`);
    });
  });

  describe('New OAuth User Registration', () => {
    test('should create profile for new OAuth user with default landlord role', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@gmail.com',
        user_metadata: {
          full_name: 'New User',
        },
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // First call: profile doesn't exist (returns null)
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      (addUserToIamGroupByRole as jest.Mock).mockResolvedValue(undefined);

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(mockInsert).toHaveBeenCalledWith({
        id: 'new-user-123',
        display_name: 'New User',
        role: 'landlord',
        roles: ['landlord'],
        primary_role: 'landlord',
      });

      expect(addUserToIamGroupByRole).toHaveBeenCalledWith(
        mockAdminClient,
        'new-user-123',
        'landlord'
      );

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/landlord/dashboard`
      );
    });

    test('should extract display name from user metadata (name field)', async () => {
      const mockUser = {
        id: 'new-user-456',
        email: 'facebook@example.com',
        user_metadata: {
          name: 'Facebook User', // Facebook uses 'name' instead of 'full_name'
        },
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Facebook User',
        })
      );
    });

    test('should fallback to email username when no display name in metadata', async () => {
      const mockUser = {
        id: 'new-user-789',
        email: 'minimal@example.com',
        user_metadata: {},
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'minimal', // Email username before @
        })
      );
    });

    test('should redirect to login with error when profile creation fails', async () => {
      const mockUser = {
        id: 'new-user-error',
        email: 'error@example.com',
        user_metadata: { full_name: 'Error User' },
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({
        error: new Error('Database constraint violation'),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=create_profile_failed')
      );
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('message=')
      );
    });

    test('should continue even if IAM group assignment fails', async () => {
      const mockUser = {
        id: 'new-user-iam-fail',
        email: 'iamfail@example.com',
        user_metadata: { full_name: 'IAM Fail User' },
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      // IAM assignment fails
      (addUserToIamGroupByRole as jest.Mock).mockRejectedValue(
        new Error('IAM service unavailable')
      );

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      // Should NOT throw error
      await GET(request);

      // Should still redirect to dashboard
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/landlord/dashboard`
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined user metadata gracefully', async () => {
      const mockUser = {
        id: 'user-no-meta',
        email: 'nometa@example.com',
        // No user_metadata field
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'nometa',
        })
      );
    });

    test('should default to landlord role when profile has empty roles array', async () => {
      const mockUser = {
        id: 'user-empty-roles',
        email: 'empty@example.com',
      };

      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockProfile = {
        roles: [], // Empty roles array
        primary_role: null,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new Request(`${mockOrigin}/auth/callback?code=valid_code`);

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        `${mockOrigin}/landlord/dashboard`
      );
    });
  });
});
