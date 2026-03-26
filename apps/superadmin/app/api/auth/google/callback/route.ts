// Google OAuth2 callback — exchanges code for tokens, fetches blog list, saves to DB
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface BloggerBlog {
  id: string;
  name: string;
  url: string;
}

interface BloggerListResponse {
  items?: BloggerBlog[];
}

export async function GET(request: NextRequest) {
  const settingsUrl = `${process.env.NEXT_PUBLIC_SUPERADMIN_URL ?? 'http://localhost:3001'}/superadmin/settings/integrations`;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${settingsUrl}?error=google_auth_denied`);
  }

  const clientId = process.env.GOOGLE_BLOGGER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BLOGGER_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
    ?? `${process.env.NEXT_PUBLIC_SUPERADMIN_URL ?? 'http://localhost:3001'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?error=google_config_missing`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${settingsUrl}?error=google_token_exchange_failed`);
    }

    const tokens = await tokenRes.json() as GoogleTokenResponse;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Fetch user's Blogger blogs
    const blogsRes = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (blogsRes.ok) {
      await blogsRes.json() as BloggerListResponse;
    }

    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${settingsUrl}?error=not_logged_in`);
    }

    // Save to DB
    const admin = createAdminClient();
    await admin
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        platform: 'google_blogger',
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? null,
        google_token_expires_at: expiresAt,
        google_blog_id: null,
        google_blog_url: null,
        google_blog_name: null,
        is_connected: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });

    return NextResponse.redirect(`${settingsUrl}?success=google_connected`);
  } catch (err) {
    console.error('[GoogleOAuth] callback error:', err);
    return NextResponse.redirect(`${settingsUrl}?error=unexpected`);
  }
}
