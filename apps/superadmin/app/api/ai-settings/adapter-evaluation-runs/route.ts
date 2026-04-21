import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';
import type {
  AdapterEvaluationGroupSummaryDto,
  AdapterEvaluationHistoryEntryDto,
} from '@/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation-runs-types';

export const runtime = 'nodejs';

type RpcGroupRow = {
  adapter_id: string;
  channel: string;
  total_runs: string | number;
  last_at: string | null;
  last_summary: string | null;
};

/**
 * GET ?summary=1 — aggregated per (adapter_id, channel) + recent entries for Evaluations Global UI.
 * GET ?adapterId=&channel=cli|http&limit=&offset= — paginated runs for one adapter + channel.
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    routeLabel: 'api/ai-settings/adapter-evaluation-runs',
    allowHeaderFallback: false,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const userId = auth.userId;

  const { searchParams } = request.nextUrl;
  const summary = searchParams.get('summary') === '1';
  const adapterId = searchParams.get('adapterId')?.trim();
  const channelRaw = searchParams.get('channel');
  const channel: 'cli' | 'http' | null =
    channelRaw === 'http' ? 'http' : channelRaw === 'cli' ? 'cli' : null;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  try {
    if (summary) {
      const { data: groups, error: rpcError } = await supabase.rpc('adapter_evaluation_group_summary', {
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;

      const { data: recentRows, error: recentErr } = await supabase
        .from('adapter_evaluation_runs')
        .select('adapter_id, channel, created_at, result_summary, http_status, evaluation_level')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (recentErr) throw recentErr;

      const recentByKey = new Map<string, AdapterEvaluationHistoryEntryDto[]>();
      for (const row of recentRows ?? []) {
        const key = `${row.adapter_id}:${row.channel}`;
        const arr = recentByKey.get(key) ?? [];
        if (arr.length < 25) {
          arr.push({
            at: row.created_at,
            resultSummary: row.result_summary ?? '',
            httpStatus: row.http_status,
            evaluationLevel: row.evaluation_level ?? 'pending',
          });
          recentByKey.set(key, arr);
        }
      }

      const summaries: AdapterEvaluationGroupSummaryDto[] = ((groups ?? []) as RpcGroupRow[]).map((g) => {
        const aid = g.adapter_id;
        const ch = g.channel === 'http' ? 'http' : 'cli';
        const k = `${aid}:${ch}`;
        return {
          adapterId: aid,
          channel: ch,
          totalRuns: Number(g.total_runs),
          lastAt: g.last_at,
          lastSummary: g.last_summary ?? '',
          recentEntries: recentByKey.get(k) ?? [],
        };
      });

      return NextResponse.json({ summaries });
    }

    if (!adapterId || !channel) {
      return NextResponse.json(
        { error: 'Use summary=1 for aggregates, or pass adapterId and channel (cli|http)' },
        { status: 400 },
      );
    }

    const { data: rows, error, count } = await supabase
      .from('adapter_evaluation_runs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('adapter_id', adapterId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      runs: rows ?? [],
      total: count ?? rows?.length ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[adapter-evaluation-runs] GET error:', err);
    return NextResponse.json({ error: 'Failed to load adapter evaluation history' }, { status: 500 });
  }
}
