// Google OAuth2 initiation — redirects user to Google consent screen
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_BLOGGER_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
    ?? `${process.env.NEXT_PUBLIC_SUPERADMIN_URL ?? 'http://localhost:3001'}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_BLOGGER_CLIENT_ID 未設定' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/blogger',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
