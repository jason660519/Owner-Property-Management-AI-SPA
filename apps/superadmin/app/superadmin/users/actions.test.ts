import nodemailer from 'nodemailer';

import { inviteUser } from './actions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

describe('inviteUser', () => {
  type User = {
    id: string;
    app_metadata?: { roles?: string[] };
    user_metadata?: { roles?: string[] };
  };

  const makeClient = ({
    user,
    profileRole,
  }: {
    user: User | null;
    profileRole: string | null;
  }) => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'users_profile') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: profileRole ? { role: profileRole } : null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null }),
          }),
        }),
      };
    }),
  });

  const makeAdmin = ({
    membershipExists,
  }: {
    membershipExists: boolean;
  }) => {
    const insertInvitation = jest.fn().mockResolvedValue({ error: null });
    const insertMembership = jest.fn().mockResolvedValue({ error: null });

    return {
      auth: {
        admin: {
          generateLink: jest.fn().mockResolvedValue({
            data: {
              properties: { hashed_token: 'hashed-token', email_otp: 'otp-token' },
              user: { id: 'invited-user-id' },
            },
            error: null,
          }),
        },
      },
      from: jest.fn((table: string) => {
        if (table === 'user_invitations') return { insert: insertInvitation };
        if (table === 'iam_group_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: membershipExists ? { id: 'membership-id' } : null,
                    }),
                }),
              }),
            }),
            insert: insertMembership,
          };
        }
        return { insert: jest.fn() };
      }),
      __mocks: {
        insertInvitation,
        insertMembership,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success when profile role is super_admin', async () => {
    const client = makeClient({
      user: { id: 'admin-id', app_metadata: {}, user_metadata: {} },
      profileRole: 'super_admin',
    });
    const admin = makeAdmin({ membershipExists: false });

    (createClient as unknown as jest.Mock).mockResolvedValue(client);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(admin);

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    const result = await inviteUser(formData);
    expect(result).toEqual({ success: true });
    expect(admin.__mocks.insertInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        status: 'pending',
      }),
    );
    const transport = (nodemailer.createTransport as unknown as jest.Mock).mock.results[0]?.value as {
      sendMail: jest.Mock;
    };
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('returns success when app_metadata includes super_admin and profile is missing', async () => {
    const client = makeClient({
      user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] }, user_metadata: {} },
      profileRole: null,
    });
    const admin = makeAdmin({ membershipExists: false });

    (createClient as unknown as jest.Mock).mockResolvedValue(client);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(admin);

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    const result = await inviteUser(formData);
    expect(result).toEqual({ success: true });
  });

  it('returns unauthorized error when user is not super_admin', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const client = makeClient({
      user: { id: 'user-id', app_metadata: { roles: ['landlord'] }, user_metadata: {} },
      profileRole: 'landlord',
    });
    const admin = makeAdmin({ membershipExists: false });

    (createClient as unknown as jest.Mock).mockResolvedValue(client);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(admin);

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    const result = await inviteUser(formData);
    expect(result).toEqual({ error: 'Unauthorized: Admin access required' });
    expect(admin.__mocks.insertInvitation).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('adds group membership when groupId is provided and membership does not exist', async () => {
    const client = makeClient({
      user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] }, user_metadata: {} },
      profileRole: null,
    });
    const admin = makeAdmin({ membershipExists: false });

    (createClient as unknown as jest.Mock).mockResolvedValue(client);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(admin);

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('groupId', 'group-1');

    const result = await inviteUser(formData);
    expect(result).toEqual({ success: true });
    expect(admin.__mocks.insertMembership).toHaveBeenCalledWith(
      expect.objectContaining({ group_id: 'group-1' }),
    );
  });

  it('does not add group membership when membership already exists', async () => {
    const client = makeClient({
      user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] }, user_metadata: {} },
      profileRole: null,
    });
    const admin = makeAdmin({ membershipExists: true });

    (createClient as unknown as jest.Mock).mockResolvedValue(client);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(admin);

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('groupId', 'group-1');

    const result = await inviteUser(formData);
    expect(result).toEqual({ success: true });
    expect(admin.__mocks.insertMembership).not.toHaveBeenCalled();
  });
});
