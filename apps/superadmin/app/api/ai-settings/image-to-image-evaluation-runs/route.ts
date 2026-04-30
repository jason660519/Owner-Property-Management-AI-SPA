import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

type ImageToImageRunPayload = {
  rowId?: string;
  provider?: string;
  modelId?: string;
  style?: string;
  outputMode?: string;
  fileName?: string;
  prompt?: string;
  success?: boolean;
  message?: string;
  resultText?: string;
  resultImageUrl?: string;
  result2dImageUrl?: string;
  result3dImageUrl?: string;
  e2eMs?: number | null;
  httpStatus?: number | null;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cleanNullableInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/image-to-image-evaluation-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const rowId = searchParams.get('rowId')?.trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  try {
    let query = supabase
      .from('image_to_image_evaluation_runs')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.userId);

    if (rowId) query = query.eq('row_id', rowId);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      runs: data ?? [],
      total: count ?? data?.length ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[image-to-image-evaluation-runs] GET error:', err);
    return NextResponse.json({ error: 'Failed to load image-to-image evaluation history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/image-to-image-evaluation-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json() as ImageToImageRunPayload;
    const provider = cleanText(body.provider).trim();
    const modelId = cleanText(body.modelId).trim();
    if (!provider || !modelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const row = {
      user_id: auth.userId,
      row_id: cleanText(body.rowId).trim(),
      provider,
      model_id: modelId,
      style: cleanText(body.style).trim(),
      output_mode: cleanText(body.outputMode).trim(),
      file_name: cleanText(body.fileName).trim(),
      prompt: cleanText(body.prompt),
      success: body.success === true,
      message: cleanText(body.message),
      result_text: cleanText(body.resultText),
      result_image_url: cleanText(body.resultImageUrl),
      result_2d_image_url: cleanText(body.result2dImageUrl),
      result_3d_image_url: cleanText(body.result3dImageUrl),
      e2e_ms: cleanNullableInt(body.e2eMs),
      http_status: cleanNullableInt(body.httpStatus),
    };

    const { data, error } = await supabase
      .from('image_to_image_evaluation_runs')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, run: data });
  } catch (err) {
    console.error('[image-to-image-evaluation-runs] POST error:', err);
    return NextResponse.json({ error: 'Failed to save image-to-image evaluation run' }, { status: 500 });
  }
}
