
import { inviteUser, getInvites } from './actions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import nodemailer from 'nodemailer';

// Mock dependencies
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
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    }),
  },
}));

describe('Invite User TDD - Infinite Invites', () => {
  type SupabaseClientMock = {
    auth: {
      getUser: jest.Mock;
    };
    from: jest.Mock;
  };
  type SupabaseAdminMock = {
    auth: {
      admin: {
        generateLink: jest.Mock;
        listUsers: jest.Mock;
      };
    };
    from: jest.Mock;
  };

  let mockSupabase: SupabaseClientMock;
  let mockSupabaseAdmin: SupabaseAdminMock;
  let mockTransport: { sendMail: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'admin-id', app_metadata: { roles: ['super_admin'] } } },
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    };

    mockSupabaseAdmin = {
      auth: {
        admin: {
          // generateLink is the key for custom token tracking
          generateLink: jest.fn().mockResolvedValue({
            data: { 
              properties: { 
                action_link: 'http://localhost:3000/auth/confirm?token=test-token&type=invite',
                email_otp: '123456'
              },
              user: { id: 'new-user-id', email: 'test@example.com' }
            },
            error: null
          }),
          listUsers: jest.fn().mockResolvedValue({ data: { users: [] } }),
        },
      },
      from: jest.fn((table) => {
          if (table === 'user_invitations') {
              return {
                  insert: jest.fn().mockResolvedValue({ error: null }),
                  select: jest.fn(() => ({
                      eq: jest.fn(() => ({
                          order: jest.fn(() => ({
                              data: []
                          }))
                      }))
                  }))
              };
          }
          return {
              insert: jest.fn().mockResolvedValue({ error: null }),
              select: jest.fn(() => ({
                  eq: jest.fn(() => ({
                      single: jest.fn().mockResolvedValue({ data: null })
                  }))
              }))
          };
      }),
    };

    (createClient as unknown as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as unknown as jest.Mock).mockReturnValue(mockSupabaseAdmin);
    
    // Mock nodemailer transport
    mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    };
    (nodemailer.createTransport as unknown as jest.Mock).mockReturnValue(mockTransport);
  });

  it('should generate unique link and track in database for every invite call (Infinite Invites)', async () => {
    const email = 'test@example.com';
    const formData = new FormData();
    formData.append('email', email);

    // Call inviteUser 3 times
    for (let i = 0; i < 3; i++) {
        // Mock unique token for each call
        mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({
            data: { 
              properties: { 
                action_link: `http://localhost:3000/auth/confirm?token=token-${i}&type=invite`,
                email_otp: `code-${i}`
              },
              user: { id: 'new-user-id', email }
            },
            error: null
        });

        const result = await inviteUser(formData);
        expect(result.success).toBe(true);
    }

    // Expect 3 calls to generateLink
    expect(mockSupabaseAdmin.auth.admin.generateLink).toHaveBeenCalledTimes(3);
  });

  it('should send email using nodemailer instead of Supabase built-in email', async () => {
    const email = 'test@example.com';
    const formData = new FormData();
    formData.append('email', email);

    await inviteUser(formData);

    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(mockTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: email,
        subject: expect.stringContaining('You have been invited'),
        html: expect.stringContaining('http://localhost:3000/login?mode=invite'),
    }));
  });

  it('should list all invites for an email', async () => {
    const email = 'test@example.com';
    // Mock db response
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'user_invitations') {
            return {
                select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        order: jest.fn(() => ({
                            data: [
                                { id: '1', email, token: 't1', status: 'pending' },
                                { id: '2', email, token: 't2', status: 'expired' }
                            ]
                        }))
                    }))
                }))
            };
        }
        return { select: jest.fn() };
    });

    const invites = await getInvites(email);
    expect(invites).toHaveLength(2);
    expect(invites[0].status).toBe('pending');
    expect(invites[1].status).toBe('expired');
  });
});
