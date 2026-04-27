'use server';

// Seed all built-in prompts into saved_prompts table (idempotent — skips existing names)

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

import {
  TRANSCRIPT_PARSE_SCENARIO_PRESETS,
} from '@/lib/transcript-parse-scenario-prompts';
import { TRANSCRIPT_PARSE_PROMPT, TRANSCRIPT_JUDGE_PROMPT } from '@/lib/transcript-prompts';
import {
  DETECT_BUILDING_COUNT_PROMPT,
  DETECT_BUILDING_COUNT_SAVED_PROMPT_MODULE_KEY,
  DETECT_LAND_COUNT_PROMPT,
  DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
} from '@/lib/transcript-detect-prompts';
import {
  TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
  TRANSCRIPT_INTAKE_DETECT_PROMPT,
  TRANSCRIPT_INTAKE_PARSE_MODULE_KEY,
  TRANSCRIPT_INTAKE_PARSE_PROMPT,
  TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
  TRANSCRIPT_INTAKE_REVIEW_PROMPT,
} from '@/lib/transcript-parse/intake-prompts';
import { DEFAULT_PROMPT as PROPERTY_DESCRIPTION_PROMPT } from '@/app/api/property-description/stream/utils';

interface SeedEntry {
  name: string;
  content: string;
  tags: string[];
  description: string;
  /**
   * Stable SSoT lookup key. See docs/ai-prompt-safety-guide.md §2.3 for the
   * naming convention. Looked up at runtime by resolveSystemPrompt().
   */
  moduleKey?: string;
}

function buildSeedEntries(): SeedEntry[] {
  const entries: SeedEntry[] = [];

  // 1. Four transcript parse scenario presets — keyed by transcript.parse.<scenario>
  for (const preset of TRANSCRIPT_PARSE_SCENARIO_PRESETS) {
    entries.push({
      name: preset.suggestedName,
      content: preset.content,
      tags: ['謄本解析', preset.label],
      description: preset.description,
      moduleKey: `transcript.parse.${preset.scenarioKey}`,
    });
  }

  // 2. Base transcript parse prompt (without scenario prefix) — canonical
  //    lookup target for `transcript.parse`.
  entries.push({
    name: '謄本解析-通用基礎',
    content: TRANSCRIPT_PARSE_PROMPT,
    tags: ['謄本解析', '系統預設'],
    description: '所有謄本解析情境共用的基礎 Prompt（不含情境前綴）',
    moduleKey: 'transcript.parse',
  });

  // 3. Transcript judge prompt — used by run-transcript-parse-core Phase 3.
  entries.push({
    name: '謄本解析-裁判 (judge)',
    content: TRANSCRIPT_JUDGE_PROMPT,
    tags: ['謄本解析', 'OCR 評估', '系統預設'],
    description: '多模型歧異裁定用 Judge Prompt（Phase 3 衝突解決）',
    moduleKey: 'transcript.judge',
  });

  // 4. Property description prompt — used by /api/property-description/stream.
  entries.push({
    name: '物件描述文案',
    content: PROPERTY_DESCRIPTION_PROMPT,
    tags: ['文案撰寫', '系統預設'],
    description: '物件介紹文案生成的預設 Prompt',
    moduleKey: 'property.description.default',
  });

  // 5. Detect building count prompt — /api/transcript-parse/detect-building-count
  entries.push({
    name: '謄本-建號數量偵測',
    content: DETECT_BUILDING_COUNT_PROMPT,
    tags: ['謄本解析', '系統預設', '輕量偵測'],
    description: '判斷一份建物謄本內含幾筆建號（用於前置流程）',
    moduleKey: DETECT_BUILDING_COUNT_SAVED_PROMPT_MODULE_KEY,
  });

  // 6. Detect land parcel count prompt — /api/transcript-parse/detect-land-count
  entries.push({
    name: '謄本-地號數量偵測',
    content: DETECT_LAND_COUNT_PROMPT,
    tags: ['謄本解析', '系統預設', '輕量偵測'],
    description: '判斷一份土地謄本內含幾筆地號（用於前置流程）',
    moduleKey: DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
  });

  entries.push({
    name: '謄本工作台-案件初判',
    content: TRANSCRIPT_INTAKE_DETECT_PROMPT,
    tags: ['謄本解析', '系統預設', '工作台'],
    description: '統一謄本工作台的案件結構初判 Prompt（detect 階段）',
    moduleKey: TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
  });

  entries.push({
    name: '謄本工作台-結構化解析',
    content: TRANSCRIPT_INTAKE_PARSE_PROMPT,
    tags: ['謄本解析', '系統預設', '工作台'],
    description: '統一謄本工作台依初判結果進行結構化解析的 Prompt（parse 階段）',
    moduleKey: TRANSCRIPT_INTAKE_PARSE_MODULE_KEY,
  });

  entries.push({
    name: '謄本工作台-品質審核',
    content: TRANSCRIPT_INTAKE_REVIEW_PROMPT,
    tags: ['謄本解析', '系統預設', '工作台'],
    description: '統一謄本工作台交叉檢查解析結果的 Prompt（review 階段）',
    moduleKey: TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
  });

  return entries;
}

export async function seedDefaultPrompts(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { created: 0, skipped: 0, errors: ['Unauthorized'] };

  const { data: roleRows } = await supabase.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });
  const roles = Array.isArray(roleRows)
    ? roleRows.map((r: { role_name: string }) => r.role_name)
    : [];
  const isSuperAdmin = roles.includes('super_admin') || user.user_metadata?.role === 'super_admin';
  if (!isSuperAdmin) return { created: 0, skipped: 0, errors: ['Unauthorized: Super Admin only'] };

  const admin = createAdminClient();

  // Fetch existing prompts to avoid duplicates. We dedupe on BOTH name and
  // module_key so re-seeding never violates the partial unique index on
  // module_key (added by 20260411090000_add_module_key_to_saved_prompts.sql).
  const { data: existing } = await admin
    .from('saved_prompts')
    .select('name, module_key');
  const existingNames = new Set((existing ?? []).map((r) => r.name as string));
  const existingModuleKeys = new Set(
    (existing ?? [])
      .map((r) => r.module_key as string | null)
      .filter((k): k is string => !!k),
  );

  const entries = buildSeedEntries();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    if (existingNames.has(entry.name)) {
      skipped++;
      continue;
    }
    if (entry.moduleKey && existingModuleKeys.has(entry.moduleKey)) {
      // A prompt with the same module_key already exists under a different
      // name — leave it alone, the operator can rename / sync via the UI.
      skipped++;
      continue;
    }

    const { error } = await admin
      .from('saved_prompts')
      .insert({
        name: entry.name,
        content: entry.content,
        tags: entry.tags,
        description: entry.description,
        module_key: entry.moduleKey ?? null,
        created_by: user.id,
      });

    if (error) {
      errors.push(`${entry.name}: ${error.message}`);
    } else {
      created++;
    }
  }

  return { created, skipped, errors };
}
