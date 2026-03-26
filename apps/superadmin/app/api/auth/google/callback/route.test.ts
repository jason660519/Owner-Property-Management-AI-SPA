const getUserMock = jest.fn();
const upsertMock = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url: string) => new Response(null, {
      status: 307,
      headers: { location: url },
    })),
  },
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

import { GET } from './route';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;
const redirectMock = NextResponse.redirect as jest.Mock;

describe('GET /api/auth/google/callback', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_BLOGGER_CLIENT_ID: 'client-id',
      GOOGLE_BLOGGER_CLIENT_SECRET: 'client-secret',
      NEXT_PUBLIC_SUPERADMIN_URL: 'http://localhost:3001',
      GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
    };

    getUserMock.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    });
    upsertMock.mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        upsert: upsertMock,
      })),
    } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('stores tokens without auto-selecting the first blogger blog', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'blog-1', name: 'Blog One', url: 'https://one.blogspot.com' },
            { id: 'blog-2', name: 'Blog Two', url: 'https://two.blogspot.com' },
          ],
        }),
      }) as typeof fetch;

    await GET({
      url: 'http://localhost:3001/api/auth/google/callback?code=oauth-code',
    } as never);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1',
      platform: 'google_blogger',
      google_access_token: 'access-token',
      google_refresh_token: 'refresh-token',
      google_blog_id: null,
      google_blog_url: null,
      google_blog_name: null,
      is_connected: true,
    });
    expect(redirectMock).toHaveBeenCalledWith('http://localhost:3001/superadmin/settings/integrations?success=google_connected');
  });
});