import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

type IDEType = 'Cursor' | 'VSCode' | 'Antigravity' | 'Claude CLI' | 'TRAE';

type DevTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface DevTaskMetadata {
  featureSpecDocPath?: string | null;
  tddSpecDocPath?: string | null;
  unitTestFolder?: string | null;
  e2eFolder?: string | null;
  [key: string]: unknown;
}

interface CreateDevTaskPayload {
  rowId: string;
  featureName: string;
  ide: IDEType;
  prompt: string;
  metadata?: DevTaskMetadata;
}

interface DevTaskResponse {
  taskId: string;
  status: DevTaskStatus;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const body = (await request.json()) as unknown;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { rowId, featureName, ide, prompt, metadata } = body as CreateDevTaskPayload;

    if (!rowId || !featureName || !ide || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: rowId, featureName, ide, prompt' },
        { status: 400 },
      );
    }

    const allowedIdes: IDEType[] = ['Cursor', 'VSCode', 'Antigravity', 'Claude CLI', 'TRAE'];
    if (!allowedIdes.includes(ide)) {
      return NextResponse.json(
        { error: 'Invalid ide value', allowed: allowedIdes },
        { status: 400 },
      );
    }

    const initialStatus: DevTaskStatus = 'queued';

    const { data, error } = await supabase
      .from('dev_tasks')
      .insert({
        user_id: userId,
        row_id: rowId,
        feature_name: featureName,
        ide,
        prompt,
        metadata: metadata ?? {},
        status: initialStatus,
      })
      .select('id, status')
      .single();

    if (error) {
      console.error('[DevTasks] POST error inserting dev_tasks:', error);
      const errorPayload: Record<string, unknown> = { error: 'Failed to create dev task' };
      if (typeof error === 'object' && error !== null) {
        if ('message' in error) errorPayload.message = (error as { message?: string }).message;
        if ('code' in error) errorPayload.code = (error as { code?: string }).code;
        if ('details' in error) errorPayload.details = (error as { details?: string }).details;
        if ('hint' in error) errorPayload.hint = (error as { hint?: string }).hint;
      }
      return NextResponse.json(errorPayload, { status: 500 });
    }

    const response: DevTaskResponse = {
      taskId: data.id,
      status: data.status as DevTaskStatus,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('[DevTasks] POST /api/dev-tasks unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create dev task' }, { status: 500 });
  }
}

// Optional: list tasks for current user (e.g. by rowId) for history view.
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ tasks: [] });
    }

    const url = request.nextUrl;
    const rowId = url.searchParams.get('rowId');

    const query = supabase
      .from('dev_tasks')
      .select('id, row_id, feature_name, ide, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (rowId) {
      query.eq('row_id', rowId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DevTasks] GET list error:', error);
      return NextResponse.json({ error: 'Failed to fetch dev tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error('[DevTasks] GET /api/dev-tasks unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch dev tasks' }, { status: 500 });
  }
}

