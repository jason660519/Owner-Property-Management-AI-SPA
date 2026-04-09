import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { decryptApiKey } from '@/lib/crypto';
import { CALLERS } from '@/lib/utils/ai-api-callers';
import { extractJsonFromOutput } from '@/lib/utils/ai-api-callers';
import type { AIProvider } from '@/lib/ai-providers';
import type { ClassifyLLMResultItem } from '@/lib/types/model-role-catalog';

interface ClassifyBody {
  userId: string;
  mode: 'online' | 'offline';
  classifierProvider: string;
  classifierModelId: string;
}

// POST: Run AI classification on all models
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as ClassifyBody;
    const { userId: requestedUserId, mode, classifierProvider, classifierModelId } = body;

    if (!requestedUserId || !mode || !classifierProvider || !classifierModelId) {
      return NextResponse.json(
        { error: 'userId, mode, classifierProvider, classifierModelId are all required' },
        { status: 400 },
      );
    }

    if (mode !== 'online' && mode !== 'offline') {
      return NextResponse.json({ error: 'mode must be "online" or "offline"' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 1. Resolve API key for classifier
    const apiKey = await resolveApiKey(supabase, userId, classifierProvider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `No valid API key found for provider "${classifierProvider}"` },
        { status: 400 },
      );
    }

    // 2. Fetch all active models
    const { data: models, error: modelsErr } = await supabase
      .from('avialable_ai_models_and_version')
      .select('provider, model_id, model_name, description')
      .eq('is_active', true)
      .order('provider')
      .order('sort_order');

    if (modelsErr) throw modelsErr;
    if (!models || models.length === 0) {
      return NextResponse.json({ error: 'No active models found' }, { status: 404 });
    }

    // 3. Fetch all role tags
    const { data: tags, error: tagsErr } = await supabase
      .from('ai_model_role_tags')
      .select('tag_key, tag_label, description')
      .order('sort_order');

    if (tagsErr) throw tagsErr;
    if (!tags || tags.length === 0) {
      return NextResponse.json({ error: 'No role tags found' }, { status: 404 });
    }

    // 4. Build prompt
    let prompt: string;
    if (mode === 'online') {
      prompt = buildOnlinePrompt(models, tags);
    } else {
      // Offline: also fetch evaluation test results
      const { data: evals } = await supabase
        .from('ai_model_evaluations')
        .select('provider, model_id, model_name, is_working, specialties, notes, display_status_override')
        .eq('user_id', userId);

      prompt = buildOfflinePrompt(models, tags, evals ?? []);
    }

    // 5. Call classifier LLM
    const caller = CALLERS[classifierProvider as AIProvider];
    if (!caller) {
      return NextResponse.json(
        { error: `Unsupported provider "${classifierProvider}"` },
        { status: 400 },
      );
    }

    const result = await caller(apiKey, classifierModelId, '', 'text/plain', prompt);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'LLM call failed' },
        { status: 502 },
      );
    }

    // 6. Parse LLM response
    let parsed: { results: ClassifyLLMResultItem[] };
    try {
      parsed = extractJsonFromOutput(result.text) as { results: ClassifyLLMResultItem[] };
    } catch {
      console.error('[role-classify] Failed to parse LLM JSON:', result.text.slice(0, 500));
      return NextResponse.json(
        { error: 'LLM returned invalid JSON', raw: result.text.slice(0, 300) },
        { status: 502 },
      );
    }

    if (!Array.isArray(parsed?.results)) {
      return NextResponse.json(
        { error: 'LLM response missing "results" array' },
        { status: 502 },
      );
    }

    // 7. Build assignment rows
    const validTagKeys = new Set(tags.map((t) => t.tag_key));
    const source = mode === 'online' ? 'ai_online' : 'ai_offline';
    const now = new Date().toISOString();

    const rows: Array<Record<string, unknown>> = [];
    for (const item of parsed.results) {
      if (!item.provider || !item.model_id || !Array.isArray(item.tags)) continue;
      for (const t of item.tags) {
        if (!validTagKeys.has(t.tag_key)) continue;
        const confidence = typeof t.confidence === 'number'
          ? Math.min(1, Math.max(0, t.confidence))
          : 0.8;
        rows.push({
          user_id: userId,
          provider: item.provider,
          model_id: item.model_id,
          tag_key: t.tag_key,
          source,
          confidence,
          classified_at: now,
          classified_by: classifierModelId,
        });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    // 8. Upsert assignments
    const { error: upsertErr } = await supabase
      .from('ai_model_role_assignments')
      .upsert(rows, { onConflict: 'user_id,provider,model_id,tag_key' });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('[AI Settings] POST role-classify error:', err);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveApiKey(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data: keyRow } = await supabase
    .from('ai_api_keys')
    .select('api_key_encrypted, iv')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!keyRow?.api_key_encrypted || !keyRow?.iv) return null;

  try {
    return await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
  } catch {
    return null;
  }
}

interface ModelRow {
  provider: string;
  model_id: string;
  model_name: string | null;
  description: string | null;
}

interface TagRow {
  tag_key: string;
  tag_label: string;
  description: string | null;
}

interface EvalRow {
  provider: string;
  model_id: string;
  model_name: string | null;
  is_working: boolean;
  specialties: string[];
  notes: string | null;
  display_status_override: string | null;
}

function buildOnlinePrompt(models: ModelRow[], tags: TagRow[]): string {
  const tagDefs = tags
    .map((t) => `- ${t.tag_key}: ${t.tag_label}${t.description ? ` — ${t.description}` : ''}`)
    .join('\n');

  const modelList = models
    .map((m) => `- ${m.provider} / ${m.model_id} (${m.model_name ?? ''})${m.description ? ` — ${m.description}` : ''}`)
    .join('\n');

  return `You are classifying AI models by their capabilities for a real estate management platform.
Your task: for each model listed below, determine which role tags apply based on your knowledge of each model's published capabilities.

## Available Role Tags
${tagDefs}

## Classification Rules
- "online_classification" and "offline_classification" are meta-tags — do NOT assign them.
- "transcript_detection", "transcript_review", "transcript_visual_parse", "transcript_audit": require strong OCR/vision capabilities. Only assign to models with vision support.
- "photo_generation": only for models that can generate or edit images (e.g., DALL-E, Stable Diffusion).
- "video_generation": only for models that generate video from images/text.
- "ad_copy_generation": models good at creative text generation.
- "voice_generation": only for models with TTS/speech synthesis capabilities.
- A model may have multiple tags. Only assign tags where the model genuinely has that capability.
- Use confidence 0.9 for strong match, 0.7 for likely, 0.5 for uncertain.

## Models to Classify
${modelList}

## Output Format
Return ONLY valid JSON (no markdown fences, no explanation):
{"results":[{"provider":"...","model_id":"...","tags":[{"tag_key":"...","confidence":0.9}]}]}

If a model has no matching tags, include it with an empty tags array.`;
}

function buildOfflinePrompt(models: ModelRow[], tags: TagRow[], evals: EvalRow[]): string {
  const tagDefs = tags
    .map((t) => `- ${t.tag_key}: ${t.tag_label}${t.description ? ` — ${t.description}` : ''}`)
    .join('\n');

  const evalMap = new Map<string, EvalRow>();
  for (const e of evals) {
    evalMap.set(`${e.provider}::${e.model_id}`, e);
  }

  const modelLines = models.map((m) => {
    const key = `${m.provider}::${m.model_id}`;
    const ev = evalMap.get(key);
    let line = `- ${m.provider} / ${m.model_id} (${m.model_name ?? ''})`;
    if (ev) {
      const status = ev.display_status_override ?? (ev.is_working ? 'working' : 'not_working');
      line += ` | status: ${status}`;
      if (ev.specialties?.length) line += ` | specialties: ${ev.specialties.join(', ')}`;
      if (ev.notes) line += ` | notes: ${ev.notes.slice(0, 200)}`;
    } else {
      line += ' | status: untested';
    }
    return line;
  }).join('\n');

  return `You are classifying AI models based on their ACTUAL TEST RESULTS for a real estate management platform.
Use the evaluation data below to judge each model's suitability for each role.

## Available Role Tags
${tagDefs}

## Classification Rules
- "online_classification" and "offline_classification" are meta-tags — do NOT assign them.
- Base your judgment on actual test status and specialties, not just model name.
- Models with status "not_working" or "untested" should have lower confidence or no tags.
- Models with "vlm_ok" status are confirmed to handle vision tasks.
- Use confidence 0.9 for confirmed capability, 0.6 for likely based on evidence, 0.3 for uncertain.

## Models with Evaluation Data
${modelLines}

## Output Format
Return ONLY valid JSON (no markdown fences, no explanation):
{"results":[{"provider":"...","model_id":"...","tags":[{"tag_key":"...","confidence":0.9}]}]}

If a model has no matching tags, include it with an empty tags array.`;
}
