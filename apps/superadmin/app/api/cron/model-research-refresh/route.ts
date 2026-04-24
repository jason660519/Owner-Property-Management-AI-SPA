/**
 * Cron: model-research-refresh
 *
 * Runs daily (2am UTC via vercel.json).
 * Scans ai_model_research_reports for entries older than STALE_DAYS and marks
 * them 'pending' so the superadmin UI surfaces them as needing a re-run.
 *
 * Auto-refresh (actually calling the LLM research pipeline) is opt-in:
 * set CRON_AUTO_RESEARCH=1 to enable.  It is disabled by default to avoid
 * unexpected API spend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

interface ResearchRow {
  id: string;
  user_id: string;
  provider: string;
  model_id: string;
  generated_at: string | null;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: reports, error } = await supabase
    .from('ai_model_research_reports')
    .select('id, user_id, provider, model_id, generated_at')
    .eq('generation_status', 'done')
    .order('generated_at', { ascending: true });

  if (error) {
    console.error('[cron/model-research-refresh] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const stale: ResearchRow[] = (reports ?? []).filter((r: ResearchRow) => {
    if (!r.generated_at) return true;
    return now - new Date(r.generated_at).getTime() > STALE_MS;
  });

  if (stale.length === 0) {
    return NextResponse.json({ staleCount: 0, message: 'All model research reports are up to date.' });
  }

  const autoResearch = process.env.CRON_AUTO_RESEARCH === '1';

  if (!autoResearch) {
    // Informational-only mode: report which models are stale without modifying DB.
    console.warn(
      `[cron/model-research-refresh] ${stale.length} stale model(s) detected. Set CRON_AUTO_RESEARCH=1 to enable auto-marking.`,
    );
    return NextResponse.json({
      staleCount: stale.length,
      staleModels: stale.map((r) => `${r.provider}/${r.model_id}`),
      autoResearch: false,
      message: `${stale.length} model(s) have pricing older than ${STALE_DAYS} days. Enable CRON_AUTO_RESEARCH=1 to auto-mark them for refresh.`,
    });
  }

  // Auto mode: mark stale reports back to 'pending' so the UI prompts re-generation.
  const ids = stale.map((r) => r.id);
  const { error: updateError } = await supabase
    .from('ai_model_research_reports')
    .update({ generation_status: 'pending' })
    .in('id', ids);

  if (updateError) {
    console.error('[cron/model-research-refresh] update error:', updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(
    `[cron/model-research-refresh] Marked ${ids.length} model(s) as pending: ${stale.map((r) => `${r.provider}/${r.model_id}`).join(', ')}`,
  );

  return NextResponse.json({
    staleCount: stale.length,
    markedPending: ids.length,
    staleModels: stale.map((r) => `${r.provider}/${r.model_id}`),
    autoResearch: true,
    message: `${ids.length} model(s) marked as pending for pricing refresh.`,
  });
}
