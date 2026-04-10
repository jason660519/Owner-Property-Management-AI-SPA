// =============================================================================
// Lazy auto-seed — ensures saved_prompts is populated with canonical prompts
// on the first LLM call after a DB reset.
//
// This is idempotent and runs AT MOST ONCE per process (guarded by a
// module-level promise). Its job is to stop "Falling back to hard-code"
// warnings from becoming permanent after a `supabase db reset` clears
// saved_prompts.
//
// Unlike apps/superadmin/components/prompt-management/seedDefaultPrompts.ts
// (which is a Server Action requiring a Supabase session), this path is
// callable from any server context via the admin client.
//
// See docs/ai-prompt-safety-guide.md §2 and Phase 4 of the hardening plan.
// =============================================================================

import { createAdminClient } from '@/utils/supabase/admin';
import { TRANSCRIPT_PARSE_PROMPT, TRANSCRIPT_JUDGE_PROMPT } from '@/lib/transcript-prompts';
import { TRANSCRIPT_PARSE_SCENARIO_PRESETS } from '@/lib/transcript-parse-scenario-prompts';
import {
  DETECT_BUILDING_COUNT_PROMPT,
  DETECT_BUILDING_COUNT_SAVED_PROMPT_MODULE_KEY,
  DETECT_LAND_COUNT_PROMPT,
  DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
} from '@/lib/transcript-detect-prompts';
import { DEFAULT_PROMPT as PROPERTY_DESCRIPTION_PROMPT } from '@/app/api/property-description/stream/utils';

type AdminClient = ReturnType<typeof createAdminClient>;

interface SeedEntry {
  name: string;
  content: string;
  tags: string[];
  description: string;
  moduleKey: string;
}

function buildSeedEntries(): SeedEntry[] {
  const entries: SeedEntry[] = [];

  for (const preset of TRANSCRIPT_PARSE_SCENARIO_PRESETS) {
    entries.push({
      name: preset.suggestedName,
      content: preset.content,
      tags: ['謄本解析', preset.label],
      description: preset.description,
      moduleKey: `transcript.parse.${preset.scenarioKey}`,
    });
  }

  entries.push({
    name: '謄本解析-通用基礎',
    content: TRANSCRIPT_PARSE_PROMPT,
    tags: ['謄本解析', '系統預設'],
    description: '所有謄本解析情境共用的基礎 Prompt（不含情境前綴）',
    moduleKey: 'transcript.parse',
  });

  entries.push({
    name: '謄本解析-裁判 (judge)',
    content: TRANSCRIPT_JUDGE_PROMPT,
    tags: ['謄本解析', 'OCR 評估', '系統預設'],
    description: '多模型歧異裁定用 Judge Prompt（Phase 3 衝突解決）',
    moduleKey: 'transcript.judge',
  });

  entries.push({
    name: '物件描述文案',
    content: PROPERTY_DESCRIPTION_PROMPT,
    tags: ['文案撰寫', '系統預設'],
    description: '物件介紹文案生成的預設 Prompt',
    moduleKey: 'property.description.default',
  });

  entries.push({
    name: '謄本-建號數量偵測',
    content: DETECT_BUILDING_COUNT_PROMPT,
    tags: ['謄本解析', '系統預設', '輕量偵測'],
    description: '判斷一份建物謄本內含幾筆建號（用於前置流程）',
    moduleKey: DETECT_BUILDING_COUNT_SAVED_PROMPT_MODULE_KEY,
  });

  entries.push({
    name: '謄本-地號數量偵測',
    content: DETECT_LAND_COUNT_PROMPT,
    tags: ['謄本解析', '系統預設', '輕量偵測'],
    description: '判斷一份土地謄本內含幾筆地號（用於前置流程）',
    moduleKey: DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
  });

  return entries;
}

export interface EnsureSeededResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Seed any missing canonical prompts into saved_prompts. Safe to call many
 * times — rows are inserted only when their name AND module_key are both
 * absent from the table.
 */
export async function seedDefaultPromptsDirect(
  client?: AdminClient,
): Promise<EnsureSeededResult> {
  const admin = client ?? createAdminClient();

  const { data: existing, error: readErr } = await admin
    .from('saved_prompts')
    .select('name, module_key');

  if (readErr) {
    return {
      created: 0,
      skipped: 0,
      errors: [`read existing failed: ${readErr.message}`],
    };
  }

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
    if (existingNames.has(entry.name) || existingModuleKeys.has(entry.moduleKey)) {
      skipped++;
      continue;
    }
    const { error: insertErr } = await admin.from('saved_prompts').insert({
      name: entry.name,
      content: entry.content,
      tags: entry.tags,
      description: entry.description,
      module_key: entry.moduleKey,
      created_by: null,
    });
    if (insertErr) {
      errors.push(`${entry.name}: ${insertErr.message}`);
    } else {
      created++;
    }
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Process-level memoization so we only attempt auto-seed once per boot.
// ---------------------------------------------------------------------------

let seededOncePromise: Promise<EnsureSeededResult> | null = null;

/**
 * Ensure the canonical prompts are seeded, but only try once per process.
 * Subsequent calls return the cached result from the first invocation.
 * Safe to call concurrently — the promise is reused.
 */
export function ensureDefaultPromptsSeededOnce(
  client?: AdminClient,
): Promise<EnsureSeededResult> {
  if (!seededOncePromise) {
    seededOncePromise = seedDefaultPromptsDirect(client).then((result) => {
      if (result.created > 0) {
        console.info(
          `[ensure-seeded] auto-seeded ${result.created} canonical prompt(s)`,
          { skipped: result.skipped, errors: result.errors.length },
        );
      }
      return result;
    });
  }
  return seededOncePromise;
}

/** For tests only — reset the memoization so a fresh seed can be exercised. */
export function __resetEnsureSeededForTests(): void {
  seededOncePromise = null;
}
