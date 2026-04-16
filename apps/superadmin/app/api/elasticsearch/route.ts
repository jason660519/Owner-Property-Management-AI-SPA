import { NextRequest, NextResponse } from 'next/server';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL;

export async function GET(request: NextRequest) {
  if (!OCR_SERVICE_URL) {
    return NextResponse.json(
      { error: 'OCR_SERVICE_URL is not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const q = searchParams.get('q');
  const ownerName = searchParams.get('owner_name');
  const address = searchParams.get('address');

  try {
    if (action === 'search') {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (ownerName) params.set('owner_name', ownerName);
      if (address) params.set('address', address);

      const res = await fetch(
        `${OCR_SERVICE_URL}/api/v1/search/documents?${params.toString()}`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Search failed', details: await res.text() },
          { status: res.status }
        );
      }
      return NextResponse.json(await res.json());
    }

    if (action === 'health') {
      const res = await fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/health`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Health check failed', details: await res.text() },
          { status: res.status }
        );
      }
      return NextResponse.json(await res.json());
    }

    if (action === 'stats') {
      const res = await fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/stats`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Stats fetch failed', details: await res.text() },
          { status: res.status }
        );
      }
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!OCR_SERVICE_URL) {
    return NextResponse.json(
      { error: 'OCR_SERVICE_URL is not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action !== 'reindex') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const res = await fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/reindex`, {
      method: 'POST',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Reindex failed', details: await res.text() },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
