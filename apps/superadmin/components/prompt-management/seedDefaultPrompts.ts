'use server';

// Seed all built-in prompts into saved_prompts table (idempotent — skips existing names)

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

import {
  TRANSCRIPT_PARSE_SCENARIO_PRESETS,
} from '@/lib/transcript-parse-scenario-prompts';
import { TRANSCRIPT_PARSE_PROMPT, TRANSCRIPT_JUDGE_PROMPT } from '@/lib/transcript-prompts';
import { DEFAULT_PROMPT as PROPERTY_DESCRIPTION_PROMPT } from '@/app/api/property-description/stream/utils';

interface SeedEntry {
  name: string;
  content: string;
  tags: string[];
  description: string;
}

function buildSeedEntries(): SeedEntry[] {
  const entries: SeedEntry[] = [];

  // 1. Four transcript parse scenario presets
  for (const preset of TRANSCRIPT_PARSE_SCENARIO_PRESETS) {
    entries.push({
      name: preset.suggestedName,
      content: preset.content,
      tags: ['謄本解析', preset.label],
      description: preset.description,
    });
  }

  // 2. Base transcript parse prompt (without scenario prefix)
  entries.push({
    name: '謄本解析-通用基礎',
    content: TRANSCRIPT_PARSE_PROMPT,
    tags: ['謄本解析', '系統預設'],
    description: '所有謄本解析情境共用的基礎 Prompt（不含情境前綴）',
  });

  // 3. Transcript judge prompt
  entries.push({
    name: '謄本解析-裁判 (judge)',
    content: TRANSCRIPT_JUDGE_PROMPT,
    tags: ['謄本解析', 'OCR 評估', '系統預設'],
    description: '多模型歧異裁定用 Judge Prompt（Phase 3 衝突解決）',
  });

  // 4. Property description prompt
  entries.push({
    name: '物件描述文案',
    content: PROPERTY_DESCRIPTION_PROMPT,
    tags: ['文案撰寫', '系統預設'],
    description: '物件介紹文案生成的預設 Prompt',
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

  // Fetch existing prompt names to avoid duplicates
  const { data: existing } = await admin
    .from('saved_prompts')
    .select('name');
  const existingNames = new Set((existing ?? []).map(r => r.name));

  const entries = buildSeedEntries();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    if (existingNames.has(entry.name)) {
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
