// filepath: apps/superadmin/app/api/ai-settings/modules/route.ts
// API route for managing AI feature modules

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Failed to save module';
}

// GET: Fetch all feature module configs（session-authenticated user scope）
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/modules',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('ai_modules_assigned_function')
      .select('*')
      .eq('user_id', userId)
      .order('assigned_function');

    if (error) throw error;

    return NextResponse.json({ modules: data || [] });
  } catch (err) {
    console.error('[AI Settings] GET modules error:', err);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

// POST: Save or update a feature module config
export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/modules',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const effectiveUserId = authResult.userId;

  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const {
      moduleKey,
      isEnabled,
      assignedProvider,
      assignedModel,
      assignedModels,
      config,
    } = body as {
      moduleKey?: string;
      isEnabled?: boolean;
      assignedProvider?: string;
      assignedModel?: string;
      assignedModels?: unknown;
      config?: unknown;
    };

    if (!moduleKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // assignedModels: [{ provider, model }, ...] — primary; fallback to single for backward compat
    const models = Array.isArray(assignedModels)
      ? assignedModels
      : assignedProvider && assignedModel
        ? [{ provider: assignedProvider, model: assignedModel }]
        : [];

    const { data, error } = await supabase
      .from('ai_modules_assigned_function')
      .upsert(
        {
          user_id: effectiveUserId,
          assigned_function: moduleKey,
          is_enabled: isEnabled ?? false,
          assigned_models: models,
          assigned_provider: models[0]?.provider ?? null,
          assigned_model: models[0]?.model ?? null,
          config: (config as Record<string, unknown>) || {},
        },
        { onConflict: 'user_id,assigned_function' }
      )
      .select()
      .single();

    if (error) throw error;

    console.log(`[AI Settings] Assigned function ${moduleKey} updated: enabled=${isEnabled}, models=${models.length}`);
    return NextResponse.json({ module: data });
  } catch (err) {
    console.error('[AI Settings] POST module error:', err);
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
