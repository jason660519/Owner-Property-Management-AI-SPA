// API: list / upsert / delete cached AI model research reports.
// The actual generation (calling Claude with web_search) lives in ./generate/route.ts.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

const VALID_STATUSES = ['pending', 'researching', 'done', 'failed'] as const;
type ResearchStatus = (typeof VALID_STATUSES)[number];

interface ResearchReportPayload {
  provider: string;
  model_id: string;
  model_name: string;
  company_name?: string | null;
  version_label?: string | null;
  input_price_per_1m?: number | null;
  output_price_per_1m?: number | null;
  context_window?: number | null;
  knowledge_cutoff?: string | null;
  capabilities?: string[];
  source_urls?: string[];
  report_markdown?: string;
  generator_model: string;
  generator_provider: string;
  generation_status?: ResearchStatus;
  generation_error?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ reports: [] });
    }

    const { data, error } = await supabase
      .from('ai_model_research_reports')
      .select('*')
      .eq('user_id', userId)
      .order('provider')
      .order('model_id');

    if (error) throw error;

    return NextResponse.json({ reports: data ?? [] });
  } catch (err) {
    console.error('[AI Settings] GET model-research error:', err);
    return NextResponse.json({ error: 'Failed to fetch research reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { userId: requestedUserId, reports } = body as {
      userId: string;
      reports: ResearchReportPayload[];
    };

    if (!requestedUserId || !Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const rows = reports.map((r) => {
      const status: ResearchStatus = VALID_STATUSES.includes(r.generation_status as ResearchStatus)
        ? (r.generation_status as ResearchStatus)
        : 'done';
      return {
        user_id: userId,
        provider: r.provider,
        model_id: r.model_id,
        model_name: r.model_name,
        company_name: r.company_name ?? null,
        version_label: r.version_label ?? null,
        input_price_per_1m: r.input_price_per_1m ?? null,
        output_price_per_1m: r.output_price_per_1m ?? null,
        context_window: r.context_window ?? null,
        knowledge_cutoff: r.knowledge_cutoff ?? null,
        capabilities: r.capabilities ?? [],
        source_urls: r.source_urls ?? [],
        report_markdown: r.report_markdown ?? '',
        generator_model: r.generator_model,
        generator_provider: r.generator_provider,
        generation_status: status,
        generation_error: r.generation_error ?? null,
        generated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from('ai_model_research_reports')
      .upsert(rows, { onConflict: 'user_id,provider,model_id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, reports: data ?? [] });
  } catch (err) {
    console.error('[AI Settings] POST model-research error:', err);
    return NextResponse.json({ error: 'Failed to save research reports' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const modelId = searchParams.get('model_id');

    if (!requestedUserId || !provider || !modelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const { error } = await supabase
      .from('ai_model_research_reports')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('model_id', modelId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AI Settings] DELETE model-research error:', err);
    return NextResponse.json({ error: 'Failed to delete research report' }, { status: 500 });
  }
}
