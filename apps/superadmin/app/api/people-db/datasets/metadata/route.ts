import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// CRUD endpoint for dataset display overrides (rename / favorite / enable).
// The canonical key is dataset_path — same shape as ES's keyword field so the
// search tree can merge rows directly.

interface UpsertPayload {
  dataset_path: string;
  display_name?: string | null;
  favorited?: boolean;
  enabled?: boolean;
  emoji?: string | null;
  notes?: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/datasets/metadata',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dataset_metadata')
    .select('id, dataset_path, display_name, favorited, enabled, emoji, notes, updated_at')
    .order('favorited', { ascending: false })
    .order('dataset_path', { ascending: true });

  if (error) {
    return NextResponse.json({ detail: error.message, rows: [] }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/datasets/metadata',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  let payload: UpsertPayload;
  try {
    payload = (await req.json()) as UpsertPayload;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (!payload.dataset_path || typeof payload.dataset_path !== 'string') {
    return NextResponse.json({ detail: 'dataset_path is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dataset_metadata')
    .upsert(
      {
        dataset_path: payload.dataset_path,
        display_name: payload.display_name ?? null,
        favorited: payload.favorited ?? false,
        enabled: payload.enabled ?? true,
        emoji: payload.emoji ?? null,
        notes: payload.notes ?? null,
      },
      { onConflict: 'dataset_path' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ row: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/datasets/metadata',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const datasetPath = req.nextUrl.searchParams.get('dataset_path');
  if (!datasetPath) {
    return NextResponse.json({ detail: 'dataset_path query param is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('dataset_metadata')
    .delete()
    .eq('dataset_path', datasetPath);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
