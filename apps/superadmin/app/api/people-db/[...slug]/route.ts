// Proxy route: forwards requests to the FastAPI people-db service
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const BACKEND_URL = process.env.BACKEND_PEOPLE_DB_URL ?? 'http://127.0.0.1:8819';
const SAFE_SEGMENT_REGEX = /^[a-zA-Z0-9._-]+$/;

async function proxyRequest(req: NextRequest, segments: string[]) {
  const hasUnsafeSegment = segments.some(
    (segment) => !segment || segment === '.' || segment === '..' || !SAFE_SEGMENT_REGEX.test(segment)
  );
  if (hasUnsafeSegment) {
    return NextResponse.json({ detail: 'Invalid route segment' }, { status: 400 });
  }

  const slug = segments.join('/');
  const { searchParams } = req.nextUrl;
  const query = searchParams.toString();
  const targetUrl = `${BACKEND_URL}/api/v1/people-db/${slug}${query ? `?${query}` : ''}`;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleRows } = await supabase.rpc('get_user_roles', {
      lookup_user_id: user.id,
    });
    const roles = Array.isArray(roleRows)
      ? roleRows.map((row: { role_name: string }) => row.role_name)
      : [];
    const isSuperAdmin =
      roles.includes('super_admin') ||
      user.user_metadata?.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }

    (headers as Record<string, string>)['X-User-ID'] = user.id;
  } catch {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: BodyInit | undefined;
  const contentType = req.headers.get('content-type') ?? '';

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (contentType.includes('multipart/form-data')) {
      // Pass through multipart form body so file boundary is rebuilt correctly.
      body = await req.formData();
      // Do not set Content-Type so the browser sets boundary automatically
      delete (headers as Record<string, string>)['Content-Type'];
    } else {
      body = await req.text();
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });
  } catch {
    return NextResponse.json({ detail: 'Upstream people-db service unavailable' }, { status: 502 });
  }

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  return proxyRequest(req, slug);
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  return proxyRequest(req, slug);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  return proxyRequest(req, slug);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  return proxyRequest(req, slug);
}
