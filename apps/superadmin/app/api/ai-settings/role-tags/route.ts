import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// GET: Fetch all role tags ordered by sort_order
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/role-tags',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_model_role_tags')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ tags: data ?? [] });
  } catch (err) {
    console.error('[AI Settings] GET role-tags error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch role tags' },
      { status: 500 },
    );
  }
}

// POST: Create a custom role tag (is_system = false)
export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/role-tags',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as {
      tag_key?: string;
      tag_label?: string;
      description?: string;
    };

    const { tag_key, tag_label, description } = body;

    if (!tag_key || !tag_label) {
      return NextResponse.json(
        { error: 'tag_key and tag_label are required' },
        { status: 400 },
      );
    }

    // Validate tag_key format: lowercase letters, numbers, underscores only
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(tag_key)) {
      return NextResponse.json(
        { error: 'tag_key must be 2-64 chars of lowercase letters, digits, underscores, starting with a letter' },
        { status: 400 },
      );
    }

    // Get next sort_order
    const { data: maxRow } = await supabase
      .from('ai_model_role_tags')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSort = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('ai_model_role_tags')
      .insert({
        tag_key,
        tag_label,
        description: description ?? null,
        sort_order: nextSort,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `tag_key "${tag_key}" already exists` },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (err) {
    console.error('[AI Settings] POST role-tags error:', err);
    return NextResponse.json(
      { error: 'Failed to create role tag' },
      { status: 500 },
    );
  }
}
