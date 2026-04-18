import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireSuperAdmin } from '@/lib/people-db/es-gateway';

// Bulk upsert for dataset_metadata. Accepts a list of dataset_paths and a
// shared patch (favorited / enabled). Used by the sources management page to
// toggle many rows at once. We deliberately keep `display_name` and `emoji`
// out of the patch surface to reduce footguns when applying to many paths.

interface BulkPatchPayload {
  dataset_paths: string[];
  patch: {
    favorited?: boolean;
    enabled?: boolean;
  };
}

interface MetadataRow {
  id: string;
  dataset_path: string;
  display_name: string | null;
  favorited: boolean;
  enabled: boolean;
  emoji: string | null;
  notes: string | null;
  updated_at: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let payload: BulkPatchPayload;
  try {
    payload = (await req.json()) as BulkPatchPayload;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const paths = Array.isArray(payload.dataset_paths)
    ? payload.dataset_paths.filter((p) => typeof p === 'string' && p.trim().length > 0)
    : [];
  if (paths.length === 0) {
    return NextResponse.json({ detail: 'dataset_paths must be a non-empty string array' }, { status: 400 });
  }
  if (paths.length > 500) {
    return NextResponse.json({ detail: 'dataset_paths capped at 500 per request' }, { status: 400 });
  }

  const patch = payload.patch ?? {};
  const hasFavorited = typeof patch.favorited === 'boolean';
  const hasEnabled = typeof patch.enabled === 'boolean';
  if (!hasFavorited && !hasEnabled) {
    return NextResponse.json(
      { detail: 'patch must include at least one of favorited / enabled' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Fetch existing rows so we can preserve fields not in the patch.
  const { data: existingRows, error: existingErr } = await supabase
    .from('dataset_metadata')
    .select('id, dataset_path, display_name, favorited, enabled, emoji, notes')
    .in('dataset_path', paths);

  if (existingErr) {
    return NextResponse.json({ detail: existingErr.message }, { status: 500 });
  }

  const existingByPath = new Map<string, MetadataRow>();
  for (const row of existingRows ?? []) existingByPath.set(row.dataset_path, row as MetadataRow);

  const upsertPayload = paths.map((p) => {
    const existing = existingByPath.get(p);
    return {
      dataset_path: p,
      display_name: existing?.display_name ?? null,
      favorited: hasFavorited ? (patch.favorited as boolean) : existing?.favorited ?? false,
      enabled: hasEnabled ? (patch.enabled as boolean) : existing?.enabled ?? true,
      emoji: existing?.emoji ?? null,
      notes: existing?.notes ?? null,
    };
  });

  const { data, error } = await supabase
    .from('dataset_metadata')
    .upsert(upsertPayload, { onConflict: 'dataset_path' })
    .select();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    updated: data?.length ?? 0,
    rows: data ?? [],
  });
}
