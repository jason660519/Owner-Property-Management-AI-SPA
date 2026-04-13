// POST /api/webhooks/paperclip
//
// Receives Paperclip webhook events, validates HMAC-SHA256 signature,
// writes the event to paperclip_webhook_logs (status='pending'), and
// returns 202 immediately. A cron worker processes events asynchronously.

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const WEBHOOK_SECRET = process.env.PAPERCLIP_WEBHOOK_SECRET ?? '';

function verifySignature(body: string, signatureHeader: string): boolean {
  if (!WEBHOOK_SECRET) return false;

  // Header format: "sha256=<hex-digest>"
  const [prefix, digest] = signatureHeader.split('=', 2);
  if (prefix !== 'sha256' || !digest) return false;

  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    // Buffer lengths differ → invalid hex or wrong length
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Read raw body for HMAC verification (must happen before .json())
  const rawBody = await request.text();

  const signature = request.headers.get('x-paperclip-signature') ?? '';
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid signature' },
      { status: 401 },
    );
  }

  // Parse payload (already validated via HMAC, safe to parse)
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const eventType = (payload.type ?? payload.event_type ?? '') as string;
  const issue = (payload.issue ?? {}) as Record<string, unknown>;
  const issueId = (issue.id ?? payload.issue_id ?? '') as string;
  const issueKey = (issue.key ?? payload.issue_key ?? null) as string | null;

  if (!eventType || !issueId) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: type, issue.id' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('paperclip_webhook_logs').insert({
    event_type: eventType,
    issue_id: issueId,
    issue_key: issueKey,
    payload,
    status: 'pending',
  });

  if (error) {
    console.error('[webhook/paperclip] DB insert failed:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Failed to queue event' },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 202 });
}
